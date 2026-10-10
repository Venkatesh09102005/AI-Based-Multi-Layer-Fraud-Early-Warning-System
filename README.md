# AI-Based Multi-Layer Fraud Early Warning System

## Overview

The **AI-Based Multi-Layer Fraud Early Warning System** provides proactive early-warning protection against multi-vector financial fraud, including suspicious SMS phishing/scam messages, unrecognized device logins, anomalous transactions, and high-risk beneficiary transfers.

- **Phase 0 (Project Setup)**: Clean full-stack monorepo (React + Vite + FastAPI) verified.
- **Phase 1 (Database & Data Layer)**: SQLite and SQLAlchemy data models, relationships, table initializers, and seed data.
- **Phase 2 (SMS Scam Detection)**: TF-IDF + Logistic Regression classification service and live UI testing.
- **Phase 3 (Transaction Anomaly Detection)**: Unsupervised Isolation Forest model, transaction preprocessing pipeline, feature engineering, and REST API inference service.
- **Phase 3.5 (User Login & Authentication)**: JWT-based authentication, PBKDF2-HMAC password hashing, protected API endpoints, and React login/logout workflows.
- **Phase 4 (Beneficiary + Device Security Signals)**: Rule-based security signal checks for new beneficiaries and new devices with strict per-user database isolation.
- **Phase 5 (Time Correlation + URL Security Analysis)**: Contextual correlation between suspicious SMS and transactions, combined with safe offline URL heuristic analysis.
- **Phase 6 (Combined Multi-Factor Risk Engine)**: Holistic rule-based risk scoring, evidence-based explanations, and actionable safety recommendations combining all security vectors.
- **Phase 7 (Explainable Risk, Fraud Timeline & Security Alerts)**: Transparent signal breakdown scoring matrix, chronological multi-vector activity timeline, and persistent security alerts center with duplicate prevention and review/dismissal lifecycle.
- **Phase 8 (Dashboard, Safety Actions & User Feedback)**: Executive security dashboard aggregating real database metrics, contextual advisory safety recommendations, interactive user alert feedback (`useful`, `incorrect`, `reviewed`) with duplicate safety and 403 cross-user protection, and multi-tab interface.

---

## Tech Stack

- **Frontend**: React 18, Vite 5, JavaScript (Vanilla ES Modules, no TypeScript), CSS3
- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic v2
- **Authentication**: PyJWT (JSON Web Tokens), `hashlib.pbkdf2_hmac` with unique random salt
- **Database & ORM**: SQLite (`backend/fraud_warning.db`), SQLAlchemy 2.x
- **Machine Learning**: scikit-learn, pandas, numpy, joblib
  - Phase 2: TF-IDF Vectorizer + Logistic Regression (Supervised early-warning)
  - Phase 3: ColumnTransformer + Isolation Forest (Unsupervised anomaly detection)

---

## Project Structure

```text
Fraud-Warning-System/
│
├── backend/
│   ├── fraud_warning.db              # SQLite database file
│   ├── database.py                   # SQLAlchemy engine, SessionLocal, Base, get_db dependency
│   ├── models.py                     # SQLAlchemy models (User, SMSMessage, Beneficiary, Device, Transaction, Alert, RiskAssessmentRecord)
│   ├── auth.py                       # JWT token issuance, PBKDF2 hashing, and get_current_user dependency
│   ├── init_db.py                    # Safe non-destructive schema migrator and demo account initializer
│   ├── seed_data.py                  # Seed data population script with hashed credentials
│   ├── sms_service.py                # SMS model inference service with confidence scoring
│   ├── transaction_service.py        # Isolation Forest anomaly detection service
│   ├── beneficiary_service.py        # Phase 4 authenticated user beneficiary status lookup
│   ├── device_service.py             # Phase 4 authenticated user device status lookup
│   ├── time_correlation_service.py  # Phase 5 time correlation between suspicious SMS and transactions
│   ├── url_service.py               # Phase 5 safe offline URL heuristic risk analysis
│   ├── risk_engine.py               # Phase 6 multi-factor risk scoring, explanations & recommendations
│   ├── alert_service.py             # Phase 7 & 8 alerts lifecycle, deduplication, and feedback management
│   ├── dashboard_service.py         # Phase 8 real user metrics aggregation & advisory recommendations
│   ├── main.py                       # FastAPI application with public and protected REST endpoints
│   ├── requirements.txt              # Backend, auth, and ML dependencies
│   ├── test_auth_phase35.py          # Phase 3.5 authentication integration tests
│   ├── test_phase4.py                # Phase 4 beneficiary, device, and cross-user tests
│   ├── test_phase5.py                # Phase 5 time correlation and URL analysis integration tests
│   ├── test_phase6.py                # Phase 6 combined risk engine integration tests
│   ├── test_phase7.py                # Phase 7 explainability, timeline & alerts integration tests
│   ├── test_phase8.py                # Phase 8 dashboard, safety actions & user feedback integration tests
│   └── .gitignore                    # Backend exclusions
│
├── frontend/
│   ├── index.html                    # Main HTML entrypoint
│   ├── package.json                  # React and Vite scripts and dependencies
│   ├── vite.config.js                # Vite configuration with port 5173 (0.0.0.0 host binding)
│   ├── .gitignore                    # Frontend node_modules and build exclusions
│   └── src/
│       ├── main.jsx                  # React application root
│       ├── App.jsx                   # Authentication session manager (Login vs ProtectedApp)
│       ├── App.css                   # Responsive layout, badges, login card, and dashboard styling
│       ├── index.css                 # Base stylesheet
│       └── components/
│           ├── Login.jsx             # Clean modern login page with validation and error states
│           └── ProtectedApp.jsx      # Protected fraud detection dashboard with session logout
│
├── ml/
│   ├── models/
│   │   ├── sms_classifier.joblib             # Serialized SMS classification pipeline
│   │   └── transaction_anomaly_model.joblib  # Serialized Isolation Forest pipeline
│   ├── train_sms_model.py                    # SMS model training & evaluation script
│   └── train_transaction_model.py            # Transaction anomaly model training & evaluation script
│
├── data/
│   ├── sms_dataset.csv               # Balanced dataset for SMS classification
│   └── transaction_dataset.csv       # Synthetic dataset for transaction anomaly learning
│
├── .gitignore                        # Root gitignore
└── README.md                         # Project documentation and setup guide
```

---

## Phase 4: Beneficiary + Device Security Signals

### Concept & Security Signal Philosophy

Phase 4 introduces two contextual security signals:
1. **New Beneficiary Detection**: Determines whether the recipient account identifier has been used by the authenticated user before.
2. **New Device Detection**: Determines whether the originating device identifier has been registered or used by the authenticated user before.

> [!IMPORTANT]
> **Security Signal Disclaimer**:  
> **"New beneficiary or new device status is a security signal and does not prove fraud."**  
> Legitimate users frequently add new payees and log in from new phones or laptops. Therefore, these signals are surfaced strictly as contextual alerts (`"New beneficiary detected"`, `"New device detected"`), never as `"Fraud confirmed"`.

### Strict Per-User Isolation

- **Authentication Mandate**: Every security signal check requires a valid JWT Bearer token.
- **Untrusted Client Parameter Rule**: The `user_id` is extracted strictly from the verified JWT payload. Frontend parameters specifying `user_id` are never accepted.
- **Cross-User Protection**: A beneficiary or device registered to User A (e.g. Rahul Sharma) will **never** be considered "known" to User B (e.g. Demo User). When User B queries an identifier belonging to User A, the system evaluates it strictly as **`new`**.

---

### Phase 4 Endpoints

#### 1. Beneficiary Check Endpoint
`POST /api/beneficiaries/check`  
*Header:* `Authorization: Bearer <token>`  
*Request:*
```json
{
  "account_identifier": "ACC-DEMO-001"
}
```
*Response (Known Beneficiary):*
```json
{
  "beneficiary_status": "known",
  "beneficiary_id": 6,
  "message": "This beneficiary has been used by the user before."
}
```
*Response (New Beneficiary):*
```json
{
  "beneficiary_status": "new",
  "beneficiary_id": null,
  "message": "This beneficiary has not been previously recorded for this user."
}
```

#### 2. Device Check Endpoint
`POST /api/devices/check`  
*Header:* `Authorization: Bearer <token>`  
*Request:*
```json
{
  "device_identifier": "DEV-PIXEL8-DEMO-01"
}
```
*Response (Known Device):*
```json
{
  "device_status": "known",
  "device_id": 6,
  "message": "This device has been previously used by the user."
}
```
*Response (New Device):*
```json
{
  "device_status": "new",
  "device_id": null,
  "message": "This device has not been previously recorded for this user."
}
```

#### 3. Combined Security Context Check Endpoint
`POST /api/security/context-check`  
*Header:* `Authorization: Bearer <token>`  
*Request:*
```json
{
  "beneficiary_identifier": "ACC-DEMO-001",
  "device_identifier": "DEV-PIXEL8-DEMO-01"
}
```

*Response Combinations & Messages:*
| Beneficiary | Device | Message |
| :--- | :--- | :--- |
| **known** | **known** | `"Known beneficiary and known device."` |
| **new** | **known** | `"New beneficiary detected."` |
| **known** | **new** | `"New device detected."` |
| **new** | **new** | `"New beneficiary and new device detected."` |

*Example Response:*
```json
{
  "beneficiary_status": "new",
  "beneficiary_id": null,
  "device_status": "new",
  "device_id": null,
  "message": "New beneficiary and new device detected."
}
```

---

### Transaction API Integration (`POST /api/transactions/analyze`)

The existing Phase 3 Isolation Forest model endpoint now optionally accepts `beneficiary_identifier` and `device_identifier`. When supplied, it returns contextual security signals alongside the ML decision:
```json
{
  "prediction": "anomalous",
  "anomaly_score": -0.0259,
  "beneficiary_status": "new",
  "device_status": "new",
  "message": "Transaction is anomalous and involves a new beneficiary and new device."
}
```
*Note: No overall multi-layer fraud risk score is computed in this phase.*

---

## Phase 5: Time Correlation + URL Security Analysis

### Concept & Philosophy

Phase 5 adds two contextual early-warning security signals:
1. **Time Correlation**: Evaluates whether a transaction occurred within a configurable window (default 30 minutes) after a suspicious SMS was received by the authenticated user.
2. **Safe Offline URL Security Analysis**: Extracts and inspects URLs found within SMS messages using strict offline heuristic rules without any external network calls.

> [!IMPORTANT]
> **Security Signal Disclaimer**:  
> **"Time correlation and URL risk findings are security signals and do not prove fraud."**  
> Legitimate transactions may naturally occur after phishing attempts, and URLs can trigger heuristic alerts without malicious intent. Therefore, these signals are surfaced strictly as contextual alerts with explicit risk ratings (`low`, `medium`, `high`), never as `"Fraud confirmed"`.

### Part A — Time Correlation Logic

- **Window**: Default 30 minutes (configurable via `window_minutes`).
- **User Isolation**: Evaluates only suspicious SMS records (`label == 'suspicious'`) belonging strictly to the authenticated `user_id`.
- **Timing Logic**:
  - If a transaction occurs at `10:12:00` after a suspicious SMS at `10:00:00`:
    - Difference = 12 minutes (<= 30 minutes) -> `time_correlation = True`, `time_difference_minutes = 12.0`
  - If a transaction occurs at `11:00:00` (60 minutes later):
    - Difference = 60 minutes (> 30 minutes) -> `time_correlation = False`, `time_difference_minutes = null`
  - If no suspicious SMS exists before the transaction:
    - `time_correlation = False`, `time_difference_minutes = null`

### Part B — Safe Offline URL Security Analysis

- **Zero Network Interaction**: Strictly offline parsing via `urllib.parse` and regex. Never sends HTTP requests, never queries DNS, and never contacts remote hosts.
- **Extracted Fields**: `url_found` (bool), `extracted_url` (str), `domain` (str), `risk_level` (`low`, `medium`, `high`), `indicators` (list[str]).
- **Heuristic Indicators**:
  - Insecure protocol: `http://` instead of `https://`
  - Raw IPv4 address used in host instead of domain name (e.g. `http://192.168.1.100/verify`)
  - Known URL shortener services: `bit.ly`, `tinyurl.com`, `t.co`, `is.gd`, `buff.ly`, `ow.ly`, `goo.gl`
  - Excessive subdomains: > 3 subdomain levels
  - Suspiciously long URL: length > 75 characters
  - High-risk keywords in path/domain: `kyc`, `verify`, `login`, `bank`, `update`, `claim`, `bonus`, `suspend`, `account`, `pan`
  - Obfuscation using `@` symbol in authority component
  - High-risk / suspicious TLDs: `.top`, `.xyz`, `.biz`, `.info`, `.work`, `.click`, `.loan`
- **Risk Level Scoring**:
  - 0-1 indicators: `low`
  - 2 indicators: `medium`
  - 3+ indicators: `high` (or presence of raw IP address / masked shortener with keywords)

### Example Payloads

#### 1. Time Correlation
**Request (`POST /api/security/time-correlation`)**:
```json
{
  "transaction_time": "2026-10-07T10:12:00",
  "window_minutes": 30
}
```
**Response**:
```json
{
  "time_correlation": true,
  "time_difference_minutes": 12.0,
  "suspicious_sms_time": "2026-10-07T10:00:00",
  "transaction_time": "2026-10-07T10:12:00",
  "message": "Transaction occurred within 12.0 minutes of a suspicious SMS."
}
```

#### 2. Safe URL Analysis
**Request (`POST /api/security/url-analysis`)**:
```json
{
  "sms_text": "Verify your bank KYC immediately at http://192.168.1.100/verify to prevent blockage"
}
```
**Response**:
```json
{
  "url_found": true,
  "extracted_url": "http://192.168.1.100/verify",
  "domain": "192.168.1.100",
  "risk_level": "high",
  "indicators": [
    "Insecure HTTP protocol used instead of HTTPS",
    "IP address used instead of domain name",
    "Suspicious keyword(s) detected: verify, bank, kyc"
  ]
}
```

---

## Phase 6: Combined Multi-Factor Risk Engine, Explanations, and Safety Recommendations

### Architecture & Concept

Phase 6 synthesizes all previously established detection layers into a centralized, transparent, rule-based **Multi-Factor Risk Engine** (`backend/risk_engine.py`):
1. **SMS Scam Model**: Supervised TF-IDF + Logistic Regression classification.
2. **Transaction Anomaly Model**: Unsupervised Isolation Forest outlier scoring.
3. **Beneficiary Recognition**: Account payee history for the authenticated user.
4. **Device Recognition**: Device hardware/fingerprint history for the authenticated user.
5. **Time Correlation**: Temporal proximity window between suspicious SMS and transactions.
6. **URL Security Analysis**: Safe offline heuristic indicator scoring.

> [!IMPORTANT]
> **Heuristic Early-Warning Disclaimer**:  
> **"Risk scores are heuristic early-warning indicators, NOT verified fraud probabilities and NOT proof of fraud."**  
> The system does not make financial transfers, does not automatically block bank accounts, and does not contact banks.

### Transparent Rule-Based Scoring Rules & Weights

| Signal | Condition | Score Weight | Notes |
| :--- | :--- | :---: | :--- |
| **SMS Scam** | `suspicious` | **+25** | Derived from supervised ML model |
| **Transaction Anomaly** | `anomalous` | **+30** | Derived from Isolation Forest outlier detector |
| **Time Correlation** | `correlated` | **+25** | Transaction within 30 min of suspicious SMS |
| **Beneficiary** | `new` | **+15** | Payee not previously recognized for user |
| **Device** | `new` | **+10** | Device not previously recognized for user |
| **URL Risk** | `high` | **+20** (+10 capped) | Capped at +10 if SMS already scored as suspicious |
| **URL Risk** | `medium` | **+10** | Offline indicators detected |

- **De-Duplication**: If both `sms == 'suspicious'` and `url == 'high'`, their combined contribution is capped at 35 to prevent double-counting the text message content.
- **Score Clamping**: The final score is strictly clamped to `[0, 100]`.
- **Threshold Boundaries**:
  - **LOW**: `0 – 29`
  - **MEDIUM**: `30 – 59`
  - **HIGH**: `60 – 100`

### Insufficient Data Handling (`INSUFFICIENT_DATA`)

If neither primary event vector (neither SMS message text/ID nor transaction details/ID) is provided for evaluation:
- The engine does **NOT** return a misleading `LOW` score.
- Instead, it returns:
  - `risk_score: null`
  - `risk_level: "INSUFFICIENT_DATA"`
  - `explanations: ["Insufficient data: At least one primary event (SMS message or transaction details) is required to calculate a fraud risk score."]`
  - `recommended_actions: ["Provide transaction details or message content to perform a comprehensive multi-factor risk assessment."]`

### Strict User Isolation & Cross-User Security

- All requests require a valid JWT access token.
- When referencing records by ID (`sms_id` or `transaction_id`), the engine verifies that the record strictly belongs to `current_user.id`.
- If User A attempts to access User B's record, the endpoint immediately rejects the request with **HTTP 403 Forbidden**.

### Example Payload (`POST /api/security/risk-assessment`)

**Request**:
```json
{
  "sms_text": "URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.",
  "transaction_data": {
    "amount": 450000,
    "transaction_type": "UPI",
    "hour": 3,
    "day_of_week": 2,
    "location": "St. Petersburg",
    "beneficiary_identifier": "ACC-NEW-CRYPTO-99",
    "device_identifier": "DEV-NEW-PROXY-99",
    "transaction_time": "2026-10-07T10:12:00"
  },
  "transaction_time": "2026-10-07T10:12:00",
  "window_minutes": 30
}
```

**Response**:
```json
{
  "risk_score": 100,
  "risk_level": "HIGH",
  "signals": {
    "sms": "suspicious",
    "transaction": "anomalous",
    "beneficiary": "new",
    "device": "new",
    "time_correlation": "correlated",
    "url": "high"
  },
  "explanations": [
    "The SMS model classified the message as suspicious (confidence: 65.8%).",
    "The SMS contains a URL with offline risk indicators: Insecure HTTP protocol used instead of HTTPS, IP address used instead of domain name, Suspicious keyword(s) detected: verify, kyc.",
    "The transaction model classified this transaction as anomalous (isolation score: -0.0259).",
    "The beneficiary ('ACC-NEW-CRYPTO-99') is new for this user account.",
    "The device ('DEV-NEW-PROXY-99') is new for this user account.",
    "A transaction occurred within 12 minutes of a suspicious SMS."
  ],
  "recommended_actions": [
    "Do not click on links, download attachments, or reply to unsolicited messages claiming urgent account actions.",
    "Do not open the detected link; navigate independently to your bank or provider via their official verified app or website.",
    "Never share One-Time Passwords (OTPs), UPI PINs, CVVs, or login credentials with anyone, even if they claim to represent your bank.",
    "Exercise extreme caution: high temporal proximity between a suspicious SMS and this transaction suggests potential social engineering.",
    "Verify the recipient's identity and payment details through an independent, trusted communication channel before releasing funds.",
    "Confirm that this activity originated from an authorized device you recognize and control.",
    "If you suspect unauthorized transactions, immediately contact your bank using the official customer support number on the back of your card."
  ],
  "disclaimer": "This assessment is a rule-based heuristic early-warning risk indicator and does NOT constitute proof of fraud, financial advice, or automated transaction blocking.",
  "evaluated_signals_count": 6,
  "missing_signals": []
}
```

---

## Phase 7: Explainable Risk Assessments, Fraud Timeline, and Alerts

### 1. Explainability & Transparent Signal Breakdown Matrix
- Instead of an opaque aggregate number, Phase 7 exposes an explicit `signal_breakdown` matrix providing:
  - Exact point contribution for each signal (`sms_suspicious: +25`, `transaction_anomalous: +30`, `time_correlation: +25`, `new_beneficiary: +15`, `new_device: +10`, `url_high: +10/+20`).
  - Signal influence categorical tag (`High Risk`, `Temporal Closeness`, `Contextual Signal`, `Safe / Expected`, `Missing Information`).
  - Evidence-backed rationale explaining why the model/rule triggered.
  - Strict distinction between **missing input** (`is_missing: true`, cannot be assumed safe) and **safe evaluated input** (`is_missing: false`, points: `0`).
- Prominent heuristic disclaimer stating scores are rule-based early-warning signals and never constitute verified proof of fraud.

### 2. Activity & Fraud Timeline
- Aggregates historical SMS messages, financial transactions, registered beneficiaries, recognized devices, and security alerts.
- Chronologically ordered (newest first).
- Strictly isolated to the authenticated user from JWT token.
- Explicitly flags events whose timestamps are missing (`timestamp_available: false`) to avoid confusing legacy un-timestamped data with recent activity.

### 3. Persistent Security Alerts Center
- Early-warning alerts generated from risk assessments **only when justified by rules** (score ≥ 30 or HIGH/MEDIUM risk level).
- **Duplicate Prevention**: Avoids flooding the user by reusing existing alerts if an identical alert type and risk level was triggered within the preceding 15 minutes.
- **Strict Ownership**: User A can never inspect, review, or dismiss User B's alerts (returns `HTTP 403 Forbidden`).
- **Lifecycle Workflow**: Alerts progress across `NEW` ➔ `REVIEWED` or `DISMISSED` states.

---

## Phase 8: Dashboard, Safety Actions & User Feedback

### 1. Executive Security Dashboard
- **Real-Time Database Aggregation**: Directly computes live metrics from the SQLite database:
  - **Risk Assessments Distribution**: Real count of evaluated assessments, categorized into LOW, MEDIUM, and HIGH with colored visual progress bar.
  - **Security Alerts Lifecycle**: Live count of alerts partitioned by `NEW`, `REVIEWED`, and `DISMISSED`.
  - **Feedback Telemetry**: Live count of user feedback (`useful`, `incorrect`, `reviewed`).
  - **Monitored Transactions**: Real count of account transactions.
- **Strict User Isolation**: Metrics are calculated solely from records belonging to `current_user.id` derived from the validated JWT token.
- **Responsive Three-Tab Navigation**:
  1. `📊 Security Dashboard`: Executive overview, metrics, safety actions, recent alerts, recent transactions, and activity preview.
  2. `🔍 Detection Labs & Testing`: Interactive test suites for SMS ML, Transaction ML, Context Signals, Time/URL, and Combined Risk Engine.
  3. `🚨 Alerts Center & Timeline`: Dedicated alerts triage center with filtering and chronological multi-vector audit trail.

### 2. Contextual Advisory Safety Recommendations
- Dynamic, evidence-based recommendations derived from active risk signals and alert history:
  - Active high-severity alerts trigger urgent credential review suggestions.
  - New device detections trigger device verification and session management advice.
  - Suspicious URL detections trigger phishing prevention and link safety reminders.
  - High-value or anomalous transactions trigger payment authorization review.
- **Safety Philosophy & Disclaimers**:
  > [!IMPORTANT]
  > **Safety Advisory Notice**: All recommendations are strictly advisory guidance. The system **never** blocks transactions, transfers funds, freezes accounts, or contacts banks autonomously.

### 3. User Alert Feedback System
- Authenticated users can submit persistent feedback on their alerts directly from the dashboard or alerts center:
  - `useful`: Marks alert as accurate detection and acknowledges the signal.
  - `incorrect`: Marks alert as a false positive / incorrect alarm.
  - `reviewed`: Simple acknowledgment of alert review.
- **Duplicate & Update Safety**: Submitting feedback on an alert that already has feedback idempotently updates the record without creating duplicate entries.
- **Security & Ownership**: Attempting to submit or view feedback on another user's alert is strictly blocked with `HTTP 403 Forbidden`.

---

## API Endpoints Reference

| Method | Endpoint | Access | Description | Phase |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | **Public** | Root connectivity check (`{"message": "..."}`) | Phase 0 |
| `GET` | `/health` | **Public** | Health status check (`{"status": "OK", ...}`) | Phase 0 |
| `POST` | `/api/auth/login` | **Public** | Authenticate user; returns JWT access token | Phase 3.5 |
| `GET` | `/api/auth/me` | **Protected** | Retrieve profile of authenticated user | Phase 3.5 |
| `GET` | `/api/users` | **Protected** | List user records (sanitized, no password hashes) | Phase 1 |
| `GET` | `/api/sms` | **Protected** | List recorded SMS records | Phase 1 |
| `GET` | `/api/transactions` | **Protected** | List recorded transaction records (supports `?limit=`) | Phase 1/8 |
| `GET` | `/api/beneficiaries` | **Protected** | List beneficiary records | Phase 1 |
| `GET` | `/api/devices` | **Protected** | List registered devices | Phase 1 |
| `GET` | `/api/stats` | **Protected** | Database summary metrics | Phase 1 |
| `POST` | `/api/sms/predict` | **Protected** | Classify SMS message (normal vs. suspicious) | Phase 2 |
| `POST` | `/api/transactions/analyze` | **Protected** | Anomaly detection via Isolation Forest + security signals | Phase 3/4 |
| `POST` | `/api/beneficiaries/check` | **Protected** | Evaluates if beneficiary is known/new for user | Phase 4 |
| `POST` | `/api/devices/check` | **Protected** | Evaluates if device is known/new for user | Phase 4 |
| `POST` | `/api/security/context-check` | **Protected** | Evaluates combined beneficiary & device signals | Phase 4 |
| `POST` | `/api/security/time-correlation` | **Protected** | Evaluates if transaction occurred within window after suspicious SMS | Phase 5 |
| `POST` | `/api/security/url-analysis` | **Protected** | Safe offline heuristic security analysis of SMS URLs | Phase 5 |
| `POST` | `/api/security/analyze` | **Protected** | Combined time correlation + URL heuristic analysis | Phase 5 |
| `POST` | `/api/security/risk-assessment` | **Protected** | Combined multi-factor risk assessment with score, breakdown, and alert | Phase 6/7 |
| `GET` | `/api/security/timeline` | **Protected** | Chronological activity/fraud audit trail for authenticated user | Phase 7 |
| `GET` | `/api/alerts` | **Protected** | List alerts for authenticated user (supports `?status=`) | Phase 7 |
| `GET` | `/api/alerts/{id}` | **Protected** | Retrieve single alert (strictly owned by authenticated user) | Phase 7 |
| `POST` | `/api/alerts/{id}/review` | **Protected** | Mark alert status as `REVIEWED` | Phase 7 |
| `POST` | `/api/alerts/{id}/dismiss` | **Protected** | Mark alert status as `DISMISSED` | Phase 7 |
| `POST` | `/api/alerts/{id}/feedback` | **Protected** | Submit feedback on alert (`useful`, `incorrect`, `reviewed`) | Phase 8 |
| `GET` | `/api/alerts/{id}/feedback` | **Protected** | Retrieve feedback details for alert | Phase 8 |
| `GET` | `/api/dashboard/summary` | **Protected** | Aggregated security metrics, recommendations & recent activity | Phase 8 |

---

## Demo Credentials & Testing

### Demo Credentials
- **Email**: `demo@fraudwarning.com`
- **Password**: `Demo@123`
- **Known Beneficiaries**: `ACC-DEMO-001`, `ACC-DEMO-002`
- **Known Device**: `DEV-PIXEL8-DEMO-01`
- **Seeded Suspicious SMS**: Received at `2026-10-07T10:00:00` (ID: 7)
- **Seeded Anomalous Tx**: Recorded at `2026-10-07T10:12:00` (ID: 9)

### Running Automated Test Suites

```powershell
# Phase 3.5 Authentication Test Suite:
.\backend\venv\Scripts\python.exe backend/test_auth_phase35.py

# Phase 4 Security Signals & Cross-User Test Suite:
.\backend\venv\Scripts\python.exe backend/test_phase4.py

# Phase 5 Time Correlation & URL Analysis Test Suite:
.\backend\venv\Scripts\python.exe backend/test_phase5.py

# Phase 6 Combined Risk Engine Test Suite:
.\backend\venv\Scripts\python.exe backend/test_phase6.py

# Phase 7 Explainability, Timeline & Alerts Test Suite:
.\backend\venv\Scripts\python.exe backend/test_phase7.py

# Phase 8 Dashboard, Safety Actions & User Feedback Test Suite:
.\backend\venv\Scripts\python.exe backend/test_phase8.py
```

### Interactive UI Testing
1. Navigate to **`http://localhost:5173/`**.
2. Log in with `demo@fraudwarning.com` / `Demo@123`.
3. Check the **Security Dashboard** tab:
   - Notice the **Risk Assessments Distribution** progress bar and live counts.
   - Observe **Active Safety Recommendations** (advisory guidance only).
   - Review **Recent Security Alerts** with inline feedback buttons (`👍 Useful`, `👎 Incorrect`, `👁️ Reviewed`).
   - Click `👍 Useful` on an alert: The alert updates to `REVIEWED`, feedback telemetry updates, and a status pill appears.
   - Inspect the **Recent Monitored Transactions** table and **Recent Security Activity** preview.
4. Switch to the **Detection Labs & Testing** tab:
   - Run individual detection models (SMS Scam ML, Isolation Forest, Beneficiary/Device, Time Correlation & URL Heuristics, or Combined Multi-Factor Risk Assessment).
   - Evaluating risk assessments dynamically updates the dashboard counts.
5. Switch to the **Alerts Center & Timeline** tab:
   - Review filtered alerts (`ALL`, `NEW`, `REVIEWED`, `DISMISSED`) and provide feedback directly on any card.
   - Audit the full chronological activity trail with verified timestamps.
6. Verify all components operate smoothly and user isolation is strictly maintained across all endpoints.
