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
    print("PHASE 5: TIME CORRELATION + URL ANALYSIS TEST SUITE")
    print("==================================================")

    # 1. Login with demo account
    code, res = make_request("POST", "/api/auth/login", {
        "email": "demo@fraudwarning.com",
        "password": "Demo@123"
    })
    assert code == 200, f"Login failed: {res}"
    demo_token = res["access_token"]
    print(f"1. Demo User logged in successfully (ID={res['user']['id']}).")

    # 2. URL Analysis: Normal HTTPS URL
    code, res = make_request("POST", "/api/security/url-analysis", {
        "message": "Your electricity bill receipt is available at https://example.com/receipt"
    }, token=demo_token)
    print(f"2. Normal HTTPS URL: HTTP {code} -> found={res.get('url_found')}, risk={res.get('risk_level')}, url={res.get('url')}")
    assert code == 200
    assert res.get("url_found") is True
    assert res.get("url") == "https://example.com/receipt"
    assert res.get("risk_level") == "low"
    assert len(res.get("indicators", [])) == 0

    # 3. URL Analysis: IP-Address URL
    code, res = make_request("POST", "/api/security/url-analysis", {
        "message": "URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately."
    }, token=demo_token)
    print(f"3. IP-Address URL: HTTP {code} -> found={res.get('url_found')}, risk={res.get('risk_level')}, indicators={res.get('indicators')}")
    assert code == 200
    assert res.get("url_found") is True
    assert res.get("risk_level") == "high"
    assert any("IP address" in ind for ind in res.get("indicators", []))

    # 4. URL Analysis: URL Shortener
    code, res = make_request("POST", "/api/security/url-analysis", {
        "message": "Claim your prize bonus immediately at http://bit.ly/claim-bonus"
    }, token=demo_token)
    print(f"4. URL Shortener: HTTP {code} -> found={res.get('url_found')}, risk={res.get('risk_level')}, indicators={res.get('indicators')}")
    assert code == 200
    assert res.get("url_found") is True
    assert res.get("risk_level") == "high"
    assert any("shortener" in ind.lower() for ind in res.get("indicators", []))

    # 5. URL Analysis: Message with NO URL
    code, res = make_request("POST", "/api/security/url-analysis", {
        "message": "Your order from Kitchen Central has been delivered. Enjoy your meal!"
    }, token=demo_token)
    print(f"5. Message with No URL: HTTP {code} -> found={res.get('url_found')}, url={res.get('url')}, risk={res.get('risk_level')}")
    assert code == 200
    assert res.get("url_found") is False
    assert res.get("url") is None
    assert res.get("risk_level") == "low"

    # 6. Time Correlation: Suspicious SMS followed by transaction within 30 min (12 min diff)
    # Demo user's suspicious SMS was received at 2026-10-07T10:00:00
    code, res = make_request("POST", "/api/security/time-correlation", {
        "transaction_time": "2026-10-07T10:12:00"
    }, token=demo_token)
    print(f"6. Within Window (12 min): HTTP {code} -> correlated={res.get('time_correlation')}, diff={res.get('time_difference_minutes')} min")
    assert code == 200
    assert res.get("time_correlation") is True
    assert res.get("time_difference_minutes") == 12
    assert "occurred shortly after" in res.get("message")

    # 7. Time Correlation: Suspicious SMS followed by transaction after > 30 min (60 min diff)
    code, res = make_request("POST", "/api/security/time-correlation", {
        "transaction_time": "2026-10-07T11:00:00"
    }, token=demo_token)
    print(f"7. Outside Window (60 min): HTTP {code} -> correlated={res.get('time_correlation')}, diff={res.get('time_difference_minutes')}")
    assert code == 200
    assert res.get("time_correlation") is False
    assert res.get("time_difference_minutes") is None

    # 8. Time Correlation: No suspicious SMS before transaction
    code, res = make_request("POST", "/api/security/time-correlation", {
        "transaction_time": "2026-10-07T09:00:00"
    }, token=demo_token)
    print(f"8. No SMS before Tx: HTTP {code} -> correlated={res.get('time_correlation')}")
    assert code == 200
    assert res.get("time_correlation") is False
    assert res.get("time_difference_minutes") is None

    # 9. Combined Analysis: POST /api/security/analyze (Correlated + High Risk URL)
    code, res = make_request("POST", "/api/security/analyze", {
        "message": "URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.",
        "transaction_time": "2026-10-07T10:12:00"
    }, token=demo_token)
    print(f"9. Combined Security (Phishing + Correlated): HTTP {code} -> time_corr={res.get('time_correlation')} ({res.get('time_difference_minutes')}m), url_risk={res.get('url_risk_level')}")
    assert code == 200
    assert res.get("time_correlation") is True
    assert res.get("time_difference_minutes") == 12
    assert res.get("url_found") is True
    assert res.get("url_risk_level") == "high"
    assert "Fraud confirmed" not in res.get("message")

    # 10. Combined Analysis: POST /api/security/analyze (No Correlation + Normal SMS)
    code, res = make_request("POST", "/api/security/analyze", {
        "message": "Your order from Kitchen Central has been delivered. Enjoy your meal!",
        "transaction_time": "2026-10-07T12:00:00"
    }, token=demo_token)
    print(f"10. Combined Security (Normal): HTTP {code} -> time_corr={res.get('time_correlation')}, url_risk={res.get('url_risk_level')}")
    assert code == 200
    assert res.get("time_correlation") is False
    assert res.get("url_found") is False
    assert res.get("url_risk_level") == "low"

    # 11. Unauthenticated Requests (Must return HTTP 401)
    for ep, payload in [
        ("/api/security/time-correlation", {"transaction_time": "2026-10-07T10:12:00"}),
        ("/api/security/url-analysis", {"message": "Verify at http://example.com"}),
        ("/api/security/analyze", {"message": "Verify at http://example.com", "transaction_time": "2026-10-07T10:12:00"}),
    ]:
        c, r = make_request("POST", ep, payload)
        print(f"11. Unauthenticated {ep}: HTTP {c} -> {r.get('detail')}")
        assert c == 401, f"Expected 401 for {ep}, got {c}"

    # 12. Regression Test: Phase 2 SMS Detection still works
    code, res = make_request("POST", "/api/sms/predict", {
        "message": "Congratulations! You have won Rs 50,000 lottery cash prize. Call now."
    }, token=demo_token)
    print(f"12. Phase 2 SMS Model: HTTP {code} -> Pred={res.get('prediction')}, Conf={res.get('confidence')}")
    assert code == 200
    assert res.get("prediction") == "suspicious"

    # 13. Regression Test: Phase 3 Transaction Anomaly Detection still works
    code, res = make_request("POST", "/api/transactions/analyze", {
        "amount": 2500,
        "transaction_type": "CARD",
        "hour": 19,
        "day_of_week": 5,
        "location": "Pune"
    }, token=demo_token)
    print(f"13. Phase 3 Transaction Model: HTTP {code} -> Pred={res.get('prediction')}, Score={res.get('anomaly_score')}")
    assert code == 200
    assert res.get("prediction") == "normal"

    # 14. Regression Test: Phase 4 Beneficiary + Device Detection still works
    code, res = make_request("POST", "/api/security/context-check", {
        "beneficiary_identifier": "ACC-DEMO-001",
        "device_identifier": "DEV-PIXEL8-DEMO-01"
    }, token=demo_token)
    print(f"14. Phase 4 Beneficiary/Device: HTTP {code} -> Ben={res.get('beneficiary_status')}, Dev={res.get('device_status')}")
    assert code == 200
    assert res.get("beneficiary_status") == "known"
    assert res.get("device_status") == "known"

    # 15. Regression Test: Public Health endpoints
    c1, r1 = make_request("GET", "/")
    c2, r2 = make_request("GET", "/health")
    print(f"15. Public root and health: / -> {c1}, /health -> {c2}")
    assert c1 == 200 and c2 == 200

    print("==================================================")
    print("ALL PHASE 5 TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
