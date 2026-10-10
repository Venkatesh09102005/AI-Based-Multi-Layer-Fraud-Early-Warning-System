"""
Integration Test Suite for Phase 6: Combined Multi-Factor Risk Engine
AI-Based Multi-Layer Fraud Early Warning System
"""

import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"


def make_request(method, endpoint, payload=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
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
    print("PHASE 6: COMBINED MULTI-FACTOR RISK ENGINE TESTS")
    print("==================================================")

    # ----------------------------------------------------
    # 1. Login Authentication
    # ----------------------------------------------------
    code, res = make_request("POST", "/api/auth/login", {
        "email": "demo@fraudwarning.com",
        "password": "Demo@123"
    })
    assert code == 200, f"Demo login failed: {res}"
    demo_token = res["access_token"]
    demo_user_id = res["user"]["id"]
    print(f"1. Demo User logged in successfully (ID={demo_user_id}).")

    code, res = make_request("POST", "/api/auth/login", {
        "email": "rahul.sharma@example.com",
        "password": "Demo@123"
    })
    assert code == 200, f"Rahul login failed: {res}"
    rahul_token = res["access_token"]
    rahul_user_id = res["user"]["id"]
    print(f"   Rahul Sharma logged in successfully (ID={rahul_user_id}).")

    # ----------------------------------------------------
    # 2. Risk Level Thresholds: HIGH Risk Multi-Vector
    # ----------------------------------------------------
    # Suspicious SMS (25) + Anomalous Tx (30) + Time Correlated (25) + New Ben (15) + New Dev (10) + URL (10) = 115 -> clamped 100 -> HIGH
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "sms_text": "URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.",
        "transaction_data": {
            "amount": 450000,
            "transaction_type": "UPI",
            "hour": 3,
            "day_of_week": 2,
            "location": "St. Petersburg",
            "beneficiary_identifier": "ACC-UNKNOWN-9999",
            "device_identifier": "DEV-UNKNOWN-EMULATOR-01",
            "transaction_time": "2026-10-07T10:12:00"
        },
        "transaction_time": "2026-10-07T10:12:00"
    }, token=demo_token)
    print(f"2. Multi-Vector Attack: HTTP {code} -> Score={res.get('risk_score')}, Level={res.get('risk_level')}")
    assert code == 200
    assert res.get("risk_level") == "HIGH"
    assert res.get("risk_score") >= 60
    assert res.get("signals", {}).get("sms") == "suspicious"
    assert res.get("signals", {}).get("transaction") == "anomalous"
    assert res.get("signals", {}).get("beneficiary") == "new"
    assert res.get("signals", {}).get("device") == "new"
    assert len(res.get("explanations", [])) >= 4
    assert len(res.get("recommended_actions", [])) >= 3
    assert "disclaimer" in res

    # ----------------------------------------------------
    # 3. Risk Level Thresholds: MEDIUM Risk
    # ----------------------------------------------------
    # Suspicious SMS with shortener URL only: SMS (25) + URL medium/high (10) = 35 -> MEDIUM (30-59)
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "sms_text": "Claim your prize bonus immediately at http://bit.ly/claim-bonus"
    }, token=demo_token)
    print(f"3. Phishing SMS Only: HTTP {code} -> Score={res.get('risk_score')}, Level={res.get('risk_level')}")
    assert code == 200
    assert res.get("risk_level") == "MEDIUM"
    assert 30 <= res.get("risk_score") <= 59
    assert res.get("signals", {}).get("sms") == "suspicious"
    assert res.get("signals", {}).get("transaction") == "not_available"

    # ----------------------------------------------------
    # 4. Risk Level Thresholds: LOW Risk
    # ----------------------------------------------------
    # Normal SMS + Normal Tx to Known Ben & Known Dev
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "sms_text": "Your electricity bill of Rs 850 was paid successfully.",
        "transaction_data": {
            "amount": 120,
            "transaction_type": "UPI",
            "hour": 14,
            "day_of_week": 2,
            "location": "Mumbai",
            "beneficiary_identifier": "ACC-DEMO-001",
            "device_identifier": "DEV-PIXEL8-DEMO-01",
            "transaction_time": "2026-10-06T14:00:00"
        },
        "beneficiary_identifier": "ACC-DEMO-001",
        "device_identifier": "DEV-PIXEL8-DEMO-01"
    }, token=demo_token)
    print(f"4. Legitimate Event: HTTP {code} -> Score={res.get('risk_score')}, Level={res.get('risk_level')}")
    assert code == 200
    assert res.get("risk_level") == "LOW"
    assert res.get("risk_score") <= 29
    assert res.get("signals", {}).get("sms") == "normal"
    assert res.get("signals", {}).get("transaction") == "normal"
    assert res.get("signals", {}).get("beneficiary") == "known"
    assert res.get("signals", {}).get("device") == "known"

    # ----------------------------------------------------
    # 5. Insufficient / Missing Data handling
    # ----------------------------------------------------
    # Request without SMS or Transaction must return INSUFFICIENT_DATA and risk_score: None
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "beneficiary_identifier": "ACC-DEMO-001"
    }, token=demo_token)
    print(f"5. Insufficient Data: HTTP {code} -> Level={res.get('risk_level')}, Score={res.get('risk_score')}")
    assert code == 200
    assert res.get("risk_level") == "INSUFFICIENT_DATA"
    assert res.get("risk_score") is None
    assert any("Insufficient data" in exp for exp in res.get("explanations", []))

    # Empty payload
    code, res = make_request("POST", "/api/security/risk-assessment", {}, token=demo_token)
    assert code == 200
    assert res.get("risk_level") == "INSUFFICIENT_DATA"
    assert res.get("risk_score") is None

    # ----------------------------------------------------
    # 6. Database ID Referencing Assessment
    # ----------------------------------------------------
    # Assess Demo User's own SMS #7 (suspicious) + Tx #9 (anomalous)
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "sms_id": 7,
        "transaction_id": 9
    }, token=demo_token)
    print(f"6. DB Record Assessment (sms_id=7, tx_id=9): HTTP {code} -> Score={res.get('risk_score')}, Level={res.get('risk_level')}")
    assert code == 200
    assert res.get("risk_level") in ("MEDIUM", "HIGH")
    assert res.get("signals", {}).get("sms") == "suspicious"

    # ----------------------------------------------------
    # 7. Cross-User Isolation Enforcement (User A vs User B)
    # ----------------------------------------------------
    # Rahul (User 1) attempting to assess Demo User's (User 4) SMS #7 must return 403 Forbidden!
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "sms_id": 7
    }, token=rahul_token)
    print(f"7. Cross-User SMS Access (Rahul -> Demo SMS #7): HTTP {code} -> {res.get('detail')}")
    assert code == 403
    assert "Access forbidden" in res.get("detail", "")

    # Rahul (User 1) attempting to assess Demo User's (User 4) Tx #9 must return 403 Forbidden!
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "transaction_id": 9
    }, token=rahul_token)
    print(f"   Cross-User Tx Access (Rahul -> Demo Tx #9): HTTP {code} -> {res.get('detail')}")
    assert code == 403
    assert "Access forbidden" in res.get("detail", "")

    # Non-existent record returns 404
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "sms_id": 99999
    }, token=demo_token)
    print(f"   Non-existent SMS #99999: HTTP {code} -> {res.get('detail')}")
    assert code == 404

    # ----------------------------------------------------
    # 8. Unauthenticated Access (HTTP 401)
    # ----------------------------------------------------
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "sms_text": "Verify account now"
    })
    print(f"8. Unauthenticated /risk-assessment: HTTP {code} -> {res.get('detail')}")
    assert code == 401

    # ----------------------------------------------------
    # 9. Offline URL Safety Verification
    # ----------------------------------------------------
    # IP URL analysis remains completely offline and detected
    code, res = make_request("POST", "/api/security/risk-assessment", {
        "sms_text": "Verify at http://10.0.0.1/auth"
    }, token=demo_token)
    print(f"9. Offline URL Analysis: HTTP {code} -> URL Signal={res.get('signals', {}).get('url')}")
    assert code == 200
    assert res.get("signals", {}).get("url") == "high"

    # ----------------------------------------------------
    # 10. Existing Endpoints Regression Compatibility (Phases 2, 3, 4, 5)
    # ----------------------------------------------------
    # Phase 2: SMS predict
    c, r = make_request("POST", "/api/sms/predict", {"message": "Urgent claim your prize lottery"}, token=demo_token)
    assert c == 200 and r.get("prediction") == "suspicious"

    # Phase 3: Transaction analyze
    c, r = make_request("POST", "/api/transactions/analyze", {
        "amount": 250, "transaction_type": "UPI", "hour": 14, "day_of_week": 2, "location": "Mumbai"
    }, token=demo_token)
    assert c == 200 and r.get("prediction") == "normal"

    # Phase 4: Beneficiary + Device check
    c, r = make_request("POST", "/api/security/context-check", {
        "beneficiary_identifier": "ACC-DEMO-001", "device_identifier": "DEV-PIXEL8-DEMO-01"
    }, token=demo_token)
    assert c == 200 and r.get("beneficiary_status") == "known" and r.get("device_status") == "known"

    # Phase 5: Time correlation
    c, r = make_request("POST", "/api/security/time-correlation", {
        "transaction_time": "2026-10-07T10:12:00"
    }, token=demo_token)
    assert c == 200 and r.get("time_correlation") is True

    # Phase 5: URL analysis
    c, r = make_request("POST", "/api/security/url-analysis", {
        "message": "Click http://192.168.1.1/verify"
    }, token=demo_token)
    assert c == 200 and r.get("url_found") is True and r.get("risk_level") == "high"

    print("10. Existing Phase 2, 3, 4, 5 endpoints: ALL 100% COMPATIBLE")

    # ----------------------------------------------------
    # 11. Public Endpoints Compatibility
    # ----------------------------------------------------
    c1, r1 = make_request("GET", "/")
    c2, r2 = make_request("GET", "/health")
    print(f"11. Public root and health: / -> {c1}, /health -> {c2}")
    assert c1 == 200 and c2 == 200

    print("==================================================")
    print("ALL PHASE 6 INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
