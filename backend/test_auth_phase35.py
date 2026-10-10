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
    print("PHASE 3.5 AUTHENTICATION TEST SUITE")
    print("==================================================")

    # 1. Public endpoint /
    code, res = make_request("GET", "/")
    print(f"1. Public GET /: HTTP {code} -> {res.get('message')}")
    assert code == 200, f"Expected 200, got {code}"

    # 2. Public endpoint /health
    code, res = make_request("GET", "/health")
    print(f"2. Public GET /health: HTTP {code} -> {res.get('status')}")
    assert code == 200, f"Expected 200, got {code}"

    # 3. Unauthenticated GET /api/users
    code, res = make_request("GET", "/api/users")
    print(f"3. Unauthenticated GET /api/users: HTTP {code} -> {res.get('detail')}")
    assert code == 401, f"Expected 401, got {code}"

    # 4. Unauthenticated POST /api/sms/predict
    code, res = make_request("POST", "/api/sms/predict", {"message": "You have won a prize"})
    print(f"4. Unauthenticated POST /api/sms/predict: HTTP {code} -> {res.get('detail')}")
    assert code == 401, f"Expected 401, got {code}"

    # 5. Unauthenticated POST /api/transactions/analyze
    code, res = make_request("POST", "/api/transactions/analyze", {
        "amount": 500, "transaction_type": "UPI", "hour": 14, "day_of_week": 2, "location": "Mumbai"
    })
    print(f"5. Unauthenticated POST /api/transactions/analyze: HTTP {code} -> {res.get('detail')}")
    assert code == 401, f"Expected 401, got {code}"

    # 6. Login with incorrect password
    code, res = make_request("POST", "/api/auth/login", {
        "email": "demo@fraudwarning.com", "password": "WrongPassword123"
    })
    print(f"6. Login with wrong password: HTTP {code} -> {res.get('detail')}")
    assert code == 401, f"Expected 401, got {code}"
    assert res.get("detail") == "Invalid email or password", f"Unexpected error detail: {res}"

    # 7. Login with non-existent email
    code, res = make_request("POST", "/api/auth/login", {
        "email": "nobody@fraudwarning.com", "password": "Demo@123"
    })
    print(f"7. Login with wrong email: HTTP {code} -> {res.get('detail')}")
    assert code == 401, f"Expected 401, got {code}"
    assert res.get("detail") == "Invalid email or password", f"Unexpected error detail: {res}"

    # 8. Login with correct demo credentials
    code, res = make_request("POST", "/api/auth/login", {
        "email": "demo@fraudwarning.com", "password": "Demo@123"
    })
    print(f"8. Login with demo@fraudwarning.com / Demo@123: HTTP {code}")
    assert code == 200, f"Expected 200, got {code}"
    assert "access_token" in res, "Missing access_token"
    assert res.get("token_type") == "bearer", f"Expected bearer token, got {res.get('token_type')}"
    user_info = res.get("user", {})
    print(f"   User logged in: ID={user_info.get('id')}, Name={user_info.get('name')}, Email={user_info.get('email')}")
    assert "password" not in user_info and "password_hash" not in user_info and "password_salt" not in user_info, "Password or hash leaked in response!"

    token = res["access_token"]

    # 9. Test GET /api/auth/me with valid JWT
    code, res = make_request("GET", "/api/auth/me", token=token)
    print(f"9. Authenticated GET /api/auth/me: HTTP {code} -> User: {res.get('name')} ({res.get('email')})")
    assert code == 200, f"Expected 200, got {code}"
    assert res.get("email") == "demo@fraudwarning.com"

    # 10. Test GET /api/stats with valid JWT
    code, res = make_request("GET", "/api/stats", token=token)
    print(f"10. Authenticated GET /api/stats: HTTP {code} -> {res}")
    assert code == 200, f"Expected 200, got {code}"
    assert res.get("database") == "connected"

    # 11. Test SMS Scam Detection after login
    code, res = make_request("POST", "/api/sms/predict", {
        "message": "Congratulations! You have won Rs 50,000 lottery. Call immediately to claim."
    }, token=token)
    print(f"11. Authenticated POST /api/sms/predict: HTTP {code} -> Prediction={res.get('prediction')}, Conf={res.get('confidence')}")
    assert code == 200, f"Expected 200, got {code}"
    assert res.get("prediction") == "suspicious"

    # 12. Test Transaction Anomaly Detection after login
    code, res = make_request("POST", "/api/transactions/analyze", {
        "amount": 450000.0,
        "transaction_type": "UPI",
        "hour": 3,
        "day_of_week": 2,
        "location": "St. Petersburg"
    }, token=token)
    print(f"12. Authenticated POST /api/transactions/analyze: HTTP {code} -> Prediction={res.get('prediction')}, Score={res.get('anomaly_score')}")
    assert code == 200, f"Expected 200, got {code}"
    assert res.get("prediction") == "anomalous"

    # 13. Test invalid / forged token
    code, res = make_request("GET", "/api/auth/me", token="invalid.forged.jwttoken")
    print(f"13. Request with invalid token: HTTP {code} -> {res.get('detail')}")
    assert code == 401, f"Expected 401, got {code}"

    print("==================================================")
    print("ALL PHASE 3.5 TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
