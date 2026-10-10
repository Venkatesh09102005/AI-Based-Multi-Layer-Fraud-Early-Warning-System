"""
Phase 7 Integration Test Suite
AI-Based Multi-Layer Fraud Early Warning System

Tests:
1. Explainability: signal breakdown, heuristic scoring rationale, missing vs safe signals
2. Heuristic disclaimer (never claim fraud proof)
3. Alert Generation: created on High/Med, skipped on Low/Insufficient Data
4. Alert Duplicate Prevention within 15 min window
5. Alert Listing and Filtering by status
6. Alert Lifecycle Workflow (Review and Dismiss)
7. Strict User Isolation on Alerts (403 Forbidden across users)
8. Chronological Activity / Fraud Timeline (ordering, structure, missing timestamp handling)
9. Strict User Isolation on Timeline
10. Unauthenticated Access Protection (401 Unauthorized)
11. Full Regression Suite (Phases 2, 3, 4, 5, 6 endpoints)
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
    print("PHASE 7: EXPLAINABILITY, TIMELINE & ALERTS TEST SUITE")
    print("==================================================")

    # ----------------------------------------------------
    # 1. Authentication for Demo User & Rahul Sharma
    # ----------------------------------------------------
    code, res = make_request("POST", "/api/auth/login", {
        "email": "demo@fraudwarning.com",
        "password": "Demo@123"
    })
    assert code == 200, f"Demo login failed: {res}"
    demo_token = res["access_token"]
    demo_user_id = res["user"]["id"]
    print(f"1. Demo User authenticated (ID={demo_user_id}).")

    code, res = make_request("POST", "/api/auth/login", {
        "email": "rahul.sharma@example.com",
        "password": "Demo@123"
    })
    assert code == 200, f"Rahul login failed: {res}"
    rahul_token = res["access_token"]
    rahul_user_id = res["user"]["id"]
    print(f"   Rahul Sharma authenticated (ID={rahul_user_id}).")

    # ----------------------------------------------------
    # 2. Explainability & Signal Breakdown Matrix
    # ----------------------------------------------------
    payload_high = {
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
    }
    code, res = make_request("POST", "/api/security/risk-assessment", payload_high, token=demo_token)
    print(f"2. High-Risk Multi-Vector Assessment: HTTP {code} -> Score={res.get('risk_score')}, Level={res.get('risk_level')}")
    assert code == 200
    assert res.get("risk_level") == "HIGH"
    assert "signal_breakdown" in res, "Missing signal_breakdown in response"

    breakdown = res["signal_breakdown"]
    for sig in ("sms", "transaction", "beneficiary", "device", "time_correlation", "url"):
        assert sig in breakdown, f"Missing {sig} in signal_breakdown"
        assert "points" in breakdown[sig], f"Missing points for {sig}"
        assert "influence" in breakdown[sig], f"Missing influence for {sig}"
        assert "rationale" in breakdown[sig], f"Missing rationale for {sig}"
        assert "is_missing" in breakdown[sig], f"Missing is_missing flag for {sig}"

    # Verify SMS points and rationale
    assert breakdown["sms"]["points"] == 25
    assert breakdown["sms"]["is_missing"] is False
    assert "suspicious" in breakdown["sms"]["rationale"]

    # Verify transaction points
    assert breakdown["transaction"]["points"] == 30
    assert breakdown["transaction"]["is_missing"] is False

    # Verify disclaimer is present and states heuristic nature
    disclaimer = res.get("disclaimer", "")
    assert "heuristic" in disclaimer.lower()
    assert "proof of fraud" in disclaimer.lower()
    print("   Verified signal breakdown matrix and heuristic disclaimer.")

    # ----------------------------------------------------
    # 3. Missing vs Safe Distinction
    # ----------------------------------------------------
    # Assess only an SMS message (no transaction provided)
    code, res_sms_only = make_request("POST", "/api/security/risk-assessment", {
        "sms_text": "Your electricity bill of Rs 850 was paid successfully."
    }, token=demo_token)
    assert code == 200
    bd_sms_only = res_sms_only["signal_breakdown"]

    # SMS is normal (safe): is_missing must be False, points must be 0
    assert bd_sms_only["sms"]["status"] == "normal"
    assert bd_sms_only["sms"]["is_missing"] is False
    assert bd_sms_only["sms"]["points"] == 0
    assert "benign" in bd_sms_only["sms"]["rationale"].lower() or "standard" in bd_sms_only["sms"]["rationale"].lower()

    # Transaction was not provided: is_missing must be True, status not_available
    assert bd_sms_only["transaction"]["status"] == "not_available"
    assert bd_sms_only["transaction"]["is_missing"] is True
    assert "cannot be assumed safe" in bd_sms_only["transaction"]["rationale"] or "Not evaluated" in bd_sms_only["transaction"]["rationale"]
    print("3. Missing vs Safe signals strictly distinguished.")

    # ----------------------------------------------------
    # 4. Alert Generation from Risk Assessment
    # ----------------------------------------------------
    # High risk should generate an alert
    created_alert_id = res.get("alert_id")
    alert_created = res.get("alert_created")
    print(f"4. Alert created from High Risk assessment: ID={created_alert_id}, Created={alert_created}")
    assert created_alert_id is not None
    assert isinstance(created_alert_id, int)

    # Low risk should NOT generate an alert
    code, res_low = make_request("POST", "/api/security/risk-assessment", {
        "sms_text": "Your electricity bill was paid successfully.",
        "transaction_data": {
            "amount": 100,
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
    assert code == 200
    assert res_low.get("risk_level") == "LOW"
    assert res_low.get("alert_id") is None
    assert res_low.get("alert_created") is False
    print("   Verified LOW risk does not generate alerts.")

    # ----------------------------------------------------
    # 5. Alert Duplicate Prevention within 15 minutes
    # ----------------------------------------------------
    # Running the same assessment again should reuse the existing alert (alert_created == False)
    code, res_dup = make_request("POST", "/api/security/risk-assessment", payload_high, token=demo_token)
    assert code == 200
    assert res_dup.get("alert_id") == created_alert_id
    assert res_dup.get("alert_created") is False
    print("5. Duplicate prevention verified: existing alert reused without duplicates.")

    # ----------------------------------------------------
    # 6. Alert Listing and Filtering
    # ----------------------------------------------------
    code, alerts_list = make_request("GET", "/api/alerts", token=demo_token)
    print(f"6. User alerts listed: HTTP {code} -> {len(alerts_list)} alerts for Demo User.")
    assert code == 200
    assert isinstance(alerts_list, list)
    assert len(alerts_list) >= 1
    # Verify created alert is present in user's list
    matching = [a for a in alerts_list if a["id"] == created_alert_id]
    assert len(matching) == 1
    demo_alert = matching[0]
    assert demo_alert["status"] in ("NEW", "REVIEWED", "DISMISSED")
    assert demo_alert["risk_level"] == "HIGH"
    assert demo_alert["user_id"] == demo_user_id

    # ----------------------------------------------------
    # 7. Alert Review and Dismissal Workflow
    # ----------------------------------------------------
    # Mark alert as REVIEWED
    code, res_reviewed = make_request("POST", f"/api/alerts/{created_alert_id}/review", token=demo_token)
    print(f"7. Mark Alert #{created_alert_id} REVIEWED: HTTP {code} -> Status={res_reviewed.get('status')}")
    assert code == 200
    assert res_reviewed.get("status") == "REVIEWED"

    # Verify single alert GET
    code, res_get = make_request("GET", f"/api/alerts/{created_alert_id}", token=demo_token)
    assert code == 200
    assert res_get.get("status") == "REVIEWED"

    # Filter by status REVIEWED
    code, alerts_rev = make_request("GET", "/api/alerts?status=REVIEWED", token=demo_token)
    assert code == 200
    assert all(a["status"] == "REVIEWED" for a in alerts_rev)

    # Mark alert as DISMISSED
    code, res_dismissed = make_request("POST", f"/api/alerts/{created_alert_id}/dismiss", token=demo_token)
    print(f"   Mark Alert #{created_alert_id} DISMISSED: HTTP {code} -> Status={res_dismissed.get('status')}")
    assert code == 200
    assert res_dismissed.get("status") == "DISMISSED"

    # Filter by status DISMISSED
    code, alerts_dism = make_request("GET", "/api/alerts?status=DISMISSED", token=demo_token)
    assert code == 200
    assert all(a["status"] == "DISMISSED" for a in alerts_dism)

    # ----------------------------------------------------
    # 8. Strict User Isolation on Alerts
    # ----------------------------------------------------
    # Rahul Sharma attempting to view Demo User's alert must return HTTP 403 Forbidden!
    code, res_forbidden = make_request("GET", f"/api/alerts/{created_alert_id}", token=rahul_token)
    print(f"8. Cross-User Alert GET (Rahul -> Demo Alert #{created_alert_id}): HTTP {code}")
    assert code == 403
    assert "Access forbidden" in res_forbidden.get("detail", "")

    # Rahul Sharma attempting to review Demo User's alert must return HTTP 403 Forbidden!
    code, res_review_forbid = make_request("POST", f"/api/alerts/{created_alert_id}/review", token=rahul_token)
    print(f"   Cross-User Alert REVIEW (Rahul -> Demo Alert): HTTP {code}")
    assert code == 403

    # Rahul Sharma attempting to dismiss Demo User's alert must return HTTP 403 Forbidden!
    code, res_dismiss_forbid = make_request("POST", f"/api/alerts/{created_alert_id}/dismiss", token=rahul_token)
    print(f"   Cross-User Alert DISMISS (Rahul -> Demo Alert): HTTP {code}")
    assert code == 403

    # Non-existent alert returns 404
    code, res_404 = make_request("GET", "/api/alerts/99999", token=demo_token)
    print(f"   Non-existent Alert #99999: HTTP {code}")
    assert code == 404

    # ----------------------------------------------------
    # 9. Chronological Activity / Fraud Timeline
    # ----------------------------------------------------
    code, timeline = make_request("GET", "/api/security/timeline", token=demo_token)
    print(f"9. Demo User Timeline: HTTP {code} -> {len(timeline)} events.")
    assert code == 200
    assert isinstance(timeline, list)
    assert len(timeline) >= 4, f"Expected at least 4 timeline events, got {len(timeline)}"

    # Check structure of timeline events
    entity_types_found = set()
    for ev in timeline:
        assert "event_id" in ev
        assert "entity_type" in ev
        assert "event_type" in ev
        assert "title" in ev
        assert "timestamp_available" in ev
        assert isinstance(ev["timestamp_available"], bool)
        assert "metadata" in ev
        entity_types_found.add(ev["entity_type"])

        # If timestamp_available is True, timestamp must be non-empty string
        if ev["timestamp_available"]:
            assert ev["timestamp"] is not None and len(ev["timestamp"]) > 0

    print(f"   Timeline entity types represented: {entity_types_found}")
    assert "SMS" in entity_types_found
    assert "TRANSACTION" in entity_types_found
    assert "BENEFICIARY" in entity_types_found
    assert "DEVICE" in entity_types_found
    assert "ALERT" in entity_types_found

    # Verify timeline is ordered chronologically (newest first for events with timestamp)
    timestamped_events = [e for e in timeline if e["timestamp_available"]]
    for i in range(len(timestamped_events) - 1):
        ts_current = timestamped_events[i]["timestamp"]
        ts_next = timestamped_events[i + 1]["timestamp"]
        assert ts_current >= ts_next, f"Timeline ordering violated: {ts_current} < {ts_next}"
    print("   Timeline chronological ordering verified (newest first).")

    # ----------------------------------------------------
    # 10. Strict User Isolation on Timeline
    # ----------------------------------------------------
    code, rahul_timeline = make_request("GET", "/api/security/timeline", token=rahul_token)
    assert code == 200
    # None of Demo User's event IDs should appear in Rahul's timeline
    demo_event_ids = {e["event_id"] for e in timeline}
    rahul_event_ids = {e["event_id"] for e in rahul_timeline}
    assert demo_event_ids.isdisjoint(rahul_event_ids), "Cross-user data leaked between timelines!"
    print("10. Timeline strictly user-isolated: zero overlap between Demo and Rahul timelines.")

    # ----------------------------------------------------
    # 11. Unauthenticated Access Protection (HTTP 401)
    # ----------------------------------------------------
    c1, _ = make_request("GET", "/api/security/timeline")
    c2, _ = make_request("GET", "/api/alerts")
    c3, _ = make_request("POST", f"/api/alerts/{created_alert_id}/review")
    print(f"11. Unauthenticated checks: timeline -> {c1}, alerts -> {c2}, review -> {c3}")
    assert c1 == 401 and c2 == 401 and c3 == 401

    # ----------------------------------------------------
    # 12. Regression Test of Existing Phases (2, 3, 4, 5, 6)
    # ----------------------------------------------------
    # Phase 2: SMS predict
    c, r = make_request("POST", "/api/sms/predict", {"message": "You have won lottery claim now"}, token=demo_token)
    assert c == 200 and r.get("prediction") == "suspicious"

    # Phase 3: Transaction analyze
    c, r = make_request("POST", "/api/transactions/analyze", {
        "amount": 250, "transaction_type": "UPI", "hour": 14, "day_of_week": 2, "location": "Mumbai"
    }, token=demo_token)
    assert c == 200 and r.get("prediction") == "normal"

    # Phase 4: Security context check
    c, r = make_request("POST", "/api/security/context-check", {
        "beneficiary_identifier": "ACC-DEMO-001", "device_identifier": "DEV-PIXEL8-DEMO-01"
    }, token=demo_token)
    assert c == 200 and r.get("beneficiary_status") == "known"

    # Phase 5: Time correlation
    c, r = make_request("POST", "/api/security/time-correlation", {
        "transaction_time": "2026-10-07T10:12:00"
    }, token=demo_token)
    assert c == 200 and r.get("time_correlation") is True

    # Phase 5: URL analysis
    c, r = make_request("POST", "/api/security/url-analysis", {
        "message": "Click http://192.168.1.1/login"
    }, token=demo_token)
    assert c == 200 and r.get("risk_level") == "high"

    # Public health check
    c, r = make_request("GET", "/health")
    assert c == 200 and r.get("status") == "OK"

    print("12. All regression endpoints (Phases 2, 3, 4, 5, 6) verified 100% operational.")

    print("==================================================")
    print("ALL PHASE 7 INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
