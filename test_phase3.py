import urllib.request
import json

def run_tests():
    # 1. Existing GET endpoints
    get_endpoints = ['/', '/health', '/api/users', '/api/sms', '/api/transactions', '/api/beneficiaries', '/api/devices', '/api/alerts', '/api/stats']
    print('=== TESTING GET ENDPOINTS ===')
    for ep in get_endpoints:
        with urllib.request.urlopen(f'http://127.0.0.1:8000{ep}') as resp:
            print(f'{ep:<20} -> {resp.status} OK')

    # 2. Phase 2 SMS Prediction Endpoint
    print('\n=== TESTING PHASE 2 SMS PREDICT ===')
    sms_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/sms/predict',
        data=json.dumps({'message': 'Your account will be blocked today. Complete KYC immediately using this link.'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(sms_req) as resp:
        print('SMS Result:', json.loads(resp.read().decode()))

    # 3. Phase 3 Transaction Anomaly Endpoint
    print('\n=== TESTING PHASE 3 TRANSACTION ANALYZE ===')
    normal_cases = [
        {'amount': 450.0, 'transaction_type': 'UPI', 'hour': 14, 'day_of_week': 2, 'location': 'Mumbai', 'beneficiary_id': 1, 'device_id': 1, 'desc': 'Normal Grocery UPI'},
        {'amount': 2500.0, 'transaction_type': 'CARD', 'hour': 19, 'day_of_week': 5, 'location': 'Pune', 'beneficiary_id': 0, 'device_id': 2, 'desc': 'Normal Dinner Card'},
        {'amount': 10000.0, 'transaction_type': 'BANK_TRANSFER', 'hour': 11, 'day_of_week': 1, 'location': 'Delhi', 'beneficiary_id': 3, 'device_id': 1, 'desc': 'Normal Rent Transfer'},
    ]

    print('--- Normal Transactions ---')
    for tc in normal_cases:
        desc = tc.pop('desc')
        req = urllib.request.Request(
            'http://127.0.0.1:8000/api/transactions/analyze',
            data=json.dumps(tc).encode(),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"{desc:<25} -> Pred: {data['prediction'].upper():<10} Score: {data['anomaly_score']:+.4f} Msg: {data['message']}")

    unusual_cases = [
        {'amount': 450000.0, 'transaction_type': 'UPI', 'hour': 3, 'day_of_week': 2, 'location': 'St. Petersburg', 'beneficiary_id': 99, 'device_id': 99, 'desc': 'Late Foreign Transfer'},
        {'amount': 85000.0, 'transaction_type': 'ATM', 'hour': 4, 'day_of_week': 0, 'location': 'Unknown_Proxy', 'beneficiary_id': 0, 'device_id': 0, 'desc': 'Midnight ATM'},
        {'amount': 320000.0, 'transaction_type': 'BANK_TRANSFER', 'hour': 2, 'day_of_week': 3, 'location': 'Lagos', 'beneficiary_id': 99, 'device_id': 99, 'desc': 'High-Value Sudden Wire'},
    ]

    print('--- Unusual Transactions ---')
    for tc in unusual_cases:
        desc = tc.pop('desc')
        req = urllib.request.Request(
            'http://127.0.0.1:8000/api/transactions/analyze',
            data=json.dumps(tc).encode(),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"{desc:<25} -> Pred: {data['prediction'].upper():<10} Score: {data['anomaly_score']:+.4f} Msg: {data['message']}")

if __name__ == '__main__':
    run_tests()
