import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def make_request(method, endpoint, payload=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            body = resp.read().decode("utf-8")
            return status_code, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        return e.code, parsed
    except Exception as e:
        return 0, str(e)


def run_tests():
    print("==================================================")
    print("PHASE 4: BENEFICIARY + DEVICE SECURITY SIGNALS TESTS")
    print("==================================================")

    # 1. Login with demo account
    code, res = make_request("POST", "/api/auth/login", {
        "email": "demo@fraudwarning.com",
        "password": "Demo@123"
    })
    assert code == 200, f"Login failed: {res}"
    demo_token = res["access_token"]
    print(f"1. Demo User logged in successfully (ID={res['user']['id']}).")

    # 2. Known Beneficiary Test (ACC-DEMO-001)
    code, res = make_request("POST", "/api/beneficiaries/check", {
        "account_identifier": "ACC-DEMO-001"
    }, token=demo_token)
    print(f"2. Known Beneficiary: HTTP {code} -> status={res.get('beneficiary_status')}, ID={res.get('beneficiary_id')}")
    assert code == 200
    assert res.get("beneficiary_status") == "known"
    assert res.get("beneficiary_id") is not None
    assert "used by the user before" in res.get("message")

    # 3. New Beneficiary Test (ACC-NEW-9999)
    code, res = make_request("POST", "/api/beneficiaries/check", {
        "account_identifier": "ACC-NEW-9999"
    }, token=demo_token)
    print(f"3. New Beneficiary: HTTP {code} -> status={res.get('beneficiary_status')}, ID={res.get('beneficiary_id')}")
    assert code == 200
    assert res.get("beneficiary_status") == "new"
    assert res.get("beneficiary_id") is None
    assert "not been previously recorded" in res.get("message")

    # 4. Known Device Test (DEV-PIXEL8-DEMO-01)
    code, res = make_request("POST", "/api/devices/check", {
        "device_identifier": "DEV-PIXEL8-DEMO-01"
    }, token=demo_token)
    print(f"4. Known Device: HTTP {code} -> status={res.get('device_status')}, ID={res.get('device_id')}")
    assert code == 200
    assert res.get("device_status") == "known"
    assert res.get("device_id") is not None
    assert "previously used by the user" in res.get("message")

    # 5. New Device Test (DEV-NEW-LAPTOP-99)
    code, res = make_request("POST", "/api/devices/check", {
        "device_identifier": "DEV-NEW-LAPTOP-99"
    }, token=demo_token)
    print(f"5. New Device: HTTP {code} -> status={res.get('device_status')}, ID={res.get('device_id')}")
    assert code == 200
    assert res.get("device_status") == "new"
    assert res.get("device_id") is None
    assert "not been previously recorded" in res.get("message")

    # 6. Combined Check: Known + Known
    code, res = make_request("POST", "/api/security/context-check", {
        "beneficiary_identifier": "ACC-DEMO-001",
        "device_identifier": "DEV-PIXEL8-DEMO-01"
    }, token=demo_token)
    print(f"6. Combined (Known + Known): HTTP {code} -> Ben={res.get('beneficiary_status')}, Dev={res.get('device_status')}, Msg='{res.get('message')}'")
    assert code == 200
    assert res.get("beneficiary_status") == "known"
    assert res.get("device_status") == "known"
    assert res.get("message") == "Known beneficiary and known device."
    assert "Fraud confirmed" not in res.get("message")

    # 7. Combined Check: New + Known
    code, res = make_request("POST", "/api/security/context-check", {
        "beneficiary_identifier": "ACC-NEW-9999",
        "device_identifier": "DEV-PIXEL8-DEMO-01"
    }, token=demo_token)
    print(f"7. Combined (New + Known): HTTP {code} -> Ben={res.get('beneficiary_status')}, Dev={res.get('device_status')}, Msg='{res.get('message')}'")
    assert code == 200
    assert res.get("beneficiary_status") == "new"
    assert res.get("device_status") == "known"
    assert res.get("message") == "New beneficiary detected."
    assert "Fraud confirmed" not in res.get("message")

    # 8. Combined Check: Known + New
    code, res = make_request("POST", "/api/security/context-check", {
        "beneficiary_identifier": "ACC-DEMO-001",
        "device_identifier": "DEV-NEW-LAPTOP-99"
    }, token=demo_token)
    print(f"8. Combined (Known + New): HTTP {code} -> Ben={res.get('beneficiary_status')}, Dev={res.get('device_status')}, Msg='{res.get('message')}'")
    assert code == 200
    assert res.get("beneficiary_status") == "known"
    assert res.get("device_status") == "new"
    assert res.get("message") == "New device detected."
    assert "Fraud confirmed" not in res.get("message")

    # 9. Combined Check: New + New
    code, res = make_request("POST", "/api/security/context-check", {
        "beneficiary_identifier": "ACC-NEW-9999",
        "device_identifier": "DEV-NEW-LAPTOP-99"
    }, token=demo_token)
    print(f"9. Combined (New + New): HTTP {code} -> Ben={res.get('beneficiary_status')}, Dev={res.get('device_status')}, Msg='{res.get('message')}'")
    assert code == 200
    assert res.get("beneficiary_status") == "new"
    assert res.get("device_status") == "new"
    assert res.get("message") == "New beneficiary and new device detected."
    assert "Fraud confirmed" not in res.get("message")

    # 10. Unauthenticated Requests (Must be HTTP 401)
    for ep, payload in [
        ("/api/beneficiaries/check", {"account_identifier": "ACC-DEMO-001"}),
        ("/api/devices/check", {"device_identifier": "DEV-PIXEL8-DEMO-01"}),
        ("/api/security/context-check", {"beneficiary_identifier": "ACC-DEMO-001", "device_identifier": "DEV-PIXEL8-DEMO-01"}),
    ]:
        c, r = make_request("POST", ep, payload)
        print(f"10. Unauthenticated {ep}: HTTP {c} -> {r.get('detail')}")
        assert c == 401, f"Expected 401 for {ep}, got {c}"

    # 11 & 12. Cross-User Security Test
    # AC-TORRENT-884920 and DEV-SM-S23-01 belong to Rahul Sharma (user 1).
    # When Demo User (user 4) checks them, they MUST evaluate as NEW!
    code, res = make_request("POST", "/api/beneficiaries/check", {
        "account_identifier": "AC-TORRENT-884920"
    }, token=demo_token)
    print(f"11. Cross-User Beneficiary Isolation (Rahul's ben tested by Demo User): {res.get('beneficiary_status')}")
    assert code == 200
    assert res.get("beneficiary_status") == "new", "Cross-user beneficiary leak! Other user's ben marked as known!"

    code, res = make_request("POST", "/api/devices/check", {
        "device_identifier": "DEV-SM-S23-01"
    }, token=demo_token)
    print(f"12. Cross-User Device Isolation (Rahul's device tested by Demo User): {res.get('device_status')}")
    assert code == 200
    assert res.get("device_status") == "new", "Cross-user device leak! Other user's device marked as known!"

    # Also log in as Rahul (User 1) to verify Rahul CAN see his own records as known
    c_rahul, r_rahul = make_request("POST", "/api/auth/login", {
        "email": "rahul.sharma@example.com",
        "password": "Demo@123"
    })
    assert c_rahul == 200
    rahul_token = r_rahul["access_token"]
    c, res = make_request("POST", "/api/security/context-check", {
        "beneficiary_identifier": "AC-TORRENT-884920",
        "device_identifier": "DEV-SM-S23-01"
    }, token=rahul_token)
    print(f"   Verification: Same items tested by Rahul: Ben={res.get('beneficiary_status')}, Dev={res.get('device_status')} -> {res.get('message')}")
    assert res.get("beneficiary_status") == "known"
    assert res.get("device_status") == "known"

    # 13. Phase 2 SMS Scam Detection still works
    code, res = make_request("POST", "/api/sms/predict", {
        "message": "Your electricity bill of Rs 850 was paid successfully."
    }, token=demo_token)
    print(f"13. Phase 2 SMS Detection: HTTP {code} -> Pred={res.get('prediction')}, Conf={res.get('confidence')}")
    assert code == 200
    assert res.get("prediction") == "normal"

    # 14. Phase 3 Transaction Anomaly Detection with security signals
    code, res = make_request("POST", "/api/transactions/analyze", {
        "amount": 450000.0,
        "transaction_type": "UPI",
        "hour": 3,
        "day_of_week": 2,
        "location": "St. Petersburg",
        "beneficiary_identifier": "ACC-NEW-CRYPTO-99",
        "device_identifier": "DEV-NEW-PROXY-99"
    }, token=demo_token)
    print(f"14. Phase 3/4 Tx Anomaly with signals: Pred={res.get('prediction')}, Score={res.get('anomaly_score')}, Ben={res.get('beneficiary_status')}, Dev={res.get('device_status')}")
    assert code == 200
    assert res.get("prediction") == "anomalous"
    assert res.get("beneficiary_status") == "new"
    assert res.get("device_status") == "new"
    assert "anomalous" in res.get("message") and "new beneficiary" in res.get("message")

    # 15. Public root / and /health
    c1, r1 = make_request("GET", "/")
    c2, r2 = make_request("GET", "/health")
    print(f"15. Public checks: / -> {c1}, /health -> {c2}")
    assert c1 == 200 and c2 == 200

    print("==================================================")
    print("ALL PHASE 4 TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
