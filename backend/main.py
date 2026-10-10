from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from database import get_db
import models
from init_db import init_database
from sms_service import sms_service
from transaction_service import transaction_service
from beneficiary_service import check_beneficiary
from device_service import check_device
from url_service import analyze_url
from time_correlation_service import check_time_correlation
from timeline_service import get_user_timeline
from dashboard_service import get_dashboard_summary
from alert_service import (
    get_user_alerts,
    get_alert_by_id,
    review_alert,
    submit_alert_feedback,
    get_alert_feedback,
    AlertAccessForbiddenError,
    AlertNotFoundError,
)
from risk_engine import evaluate_risk, AccessForbiddenError, RecordNotFoundError
from auth import (
    create_access_token,
    verify_password,
    get_current_user,
)

# Ensure database tables and schema migrations are applied upon startup
init_database()

# Initialize FastAPI application
app = FastAPI(
    title="Fraud Early Warning System API",
    description="Multi-Layer Fraud Early Warning System API (Phases 0-8)",
    version="0.9.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Pydantic Schemas
# ============================================================================

class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Email cannot be empty.")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Password cannot be empty.")
        return v


class UserInfo(BaseModel):
    id: int
    name: str
    email: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


class SMSRequest(BaseModel):
    message: str = Field(..., description="SMS message text to classify")

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("SMS message text cannot be empty or whitespace only.")
        return v.strip()


class SMSPredictionResponse(BaseModel):
    prediction: str
    confidence: float
    message: str


class TransactionAnalyzeRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount (must be > 0)")
    transaction_type: str = Field(..., min_length=1, description="UPI, CARD, BANK_TRANSFER, ATM")
    hour: int = Field(..., ge=0, le=23, description="Hour of transaction (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")
    location: str = Field(default="Unknown", description="Transaction location / city")
    beneficiary_id: Optional[int] = Field(default=None, description="Beneficiary ID if any")
    device_id: Optional[int] = Field(default=None, description="Device ID if any")
    beneficiary_identifier: Optional[str] = Field(default=None, description="Beneficiary account/UPI identifier")
    device_identifier: Optional[str] = Field(default=None, description="Device fingerprint identifier")

    @field_validator("transaction_type")
    @classmethod
    def validate_tx_type(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("transaction_type cannot be empty.")
        return v.strip().upper()


class TransactionAnalyzeResponse(BaseModel):
    prediction: str
    anomaly_score: float
    beneficiary_status: Optional[str] = None
    device_status: Optional[str] = None
    message: str


class BeneficiaryCheckRequest(BaseModel):
    account_identifier: str = Field(..., min_length=1, description="Beneficiary account / UPI / identifier")
    name: Optional[str] = Field(default=None, description="Optional beneficiary name")

    @field_validator("account_identifier")
    @classmethod
    def validate_account(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("account_identifier cannot be empty.")
        return v.strip()


class BeneficiaryCheckResponse(BaseModel):
    beneficiary_status: str  # "known" | "new"
    beneficiary_id: Optional[int] = None
    message: str


class DeviceCheckRequest(BaseModel):
    device_identifier: str = Field(..., min_length=1, description="Device fingerprint or identifier")
    device_name: Optional[str] = Field(default=None, description="Optional device name")

    @field_validator("device_identifier")
    @classmethod
    def validate_device(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("device_identifier cannot be empty.")
        return v.strip()


class DeviceCheckResponse(BaseModel):
    device_status: str  # "known" | "new"
    device_id: Optional[int] = None
    message: str


class SecurityContextCheckRequest(BaseModel):
    beneficiary_identifier: str = Field(..., min_length=1, description="Beneficiary account identifier")
    device_identifier: str = Field(..., min_length=1, description="Device identifier")

    @field_validator("beneficiary_identifier")
    @classmethod
    def validate_ben(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("beneficiary_identifier cannot be empty.")
        return v.strip()

    @field_validator("device_identifier")
    @classmethod
    def validate_dev(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("device_identifier cannot be empty.")
        return v.strip()


class SecurityContextCheckResponse(BaseModel):
    beneficiary_status: str
    beneficiary_id: Optional[int] = None
    device_status: str
    device_id: Optional[int] = None
    message: str


# Phase 5: Time Correlation Schemas
class TimeCorrelationRequest(BaseModel):
    transaction_time: str = Field(..., description="ISO 8601 transaction timestamp, e.g. 2026-10-07T10:12:00")
    sms_time: Optional[str] = Field(default=None, description="Optional explicit SMS timestamp for ad-hoc comparison")
    window_minutes: Optional[int] = Field(default=30, ge=1, le=1440, description="Correlation window in minutes (default 30)")

    @field_validator("transaction_time")
    @classmethod
    def validate_tx_time(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("transaction_time cannot be empty.")
        return v.strip()


class TimeCorrelationResponse(BaseModel):
    time_correlation: bool
    time_difference_minutes: Optional[int] = None
    related_sms_id: Optional[int] = None
    message: str


# Phase 5: URL Analysis Schemas
class URLAnalysisRequest(BaseModel):
    message: str = Field(..., min_length=1, description="SMS message text to inspect for URLs")

    @field_validator("message")
    @classmethod
    def validate_msg(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("message cannot be empty.")
        return v.strip()


class URLAnalysisResponse(BaseModel):
    url_found: bool
    url: Optional[str] = None
    risk_level: str  # "low" | "medium" | "high"
    indicators: List[str]
    message: str


# Phase 5: Combined Security Analysis Schemas
class CombinedSecurityAnalyzeRequest(BaseModel):
    message: str = Field(..., min_length=1, description="SMS message text to evaluate")
    transaction_time: str = Field(..., description="ISO 8601 transaction timestamp")
    sms_time: Optional[str] = Field(default=None, description="Optional SMS timestamp")
    window_minutes: Optional[int] = Field(default=30, ge=1, le=1440)

    @field_validator("message")
    @classmethod
    def validate_msg(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("message cannot be empty.")
        return v.strip()

    @field_validator("transaction_time")
    @classmethod
    def validate_tx_time(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("transaction_time cannot be empty.")
        return v.strip()


class CombinedSecurityAnalyzeResponse(BaseModel):
    time_correlation: bool
    time_difference_minutes: Optional[int] = None
    url_found: bool
    url_risk_level: str
    url_indicators: List[str]
    message: str


# Phase 6: Combined Multi-Factor Risk Assessment Schemas
class TransactionRiskInput(BaseModel):
    amount: float = Field(..., gt=0, description="Monetary transaction amount")
    transaction_type: str = Field(..., description="Payment channel: UPI, CARD, BANK_TRANSFER, ATM")
    hour: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")
    location: Optional[str] = Field(default="Unknown", description="Transaction location")
    beneficiary_identifier: Optional[str] = Field(default=None, description="Beneficiary account/VPA identifier")
    device_identifier: Optional[str] = Field(default=None, description="Device identifier or fingerprint")
    transaction_time: Optional[str] = Field(default=None, description="ISO 8601 transaction timestamp")


class RiskAssessmentRequest(BaseModel):
    sms_id: Optional[int] = Field(default=None, description="Optional database ID of SMS record")
    transaction_id: Optional[int] = Field(default=None, description="Optional database ID of Transaction record")
    sms_text: Optional[str] = Field(default=None, description="Optional direct SMS text")
    transaction_data: Optional[TransactionRiskInput] = Field(default=None, description="Optional direct transaction data")
    beneficiary_identifier: Optional[str] = Field(default=None, description="Optional beneficiary identifier")
    device_identifier: Optional[str] = Field(default=None, description="Optional device identifier")
    transaction_time: Optional[str] = Field(default=None, description="Optional transaction ISO 8601 timestamp")
    window_minutes: Optional[int] = Field(default=30, ge=1, le=1440, description="Correlation window in minutes (default 30)")


class RiskAssessmentResponse(BaseModel):
    risk_score: Optional[int] = None
    risk_level: str  # "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT_DATA"
    signals: Dict[str, str]
    signal_breakdown: Optional[Dict[str, Any]] = None
    explanations: List[str]
    recommended_actions: List[str]
    disclaimer: str
    evaluated_signals_count: int
    missing_signals: List[str]
    alert_id: Optional[int] = None
    alert_created: Optional[bool] = None


class FeedbackRequest(BaseModel):
    feedback: str = Field(..., description="User feedback: reviewed, useful, incorrect")
    notes: Optional[str] = Field(default=None, description="Optional note or explanation")

    @field_validator("feedback")
    @classmethod
    def validate_feedback(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("feedback cannot be empty.")
        val = v.strip().lower()
        if val not in ("reviewed", "useful", "incorrect"):
            raise ValueError("feedback must be one of: 'reviewed', 'useful', 'incorrect'.")
        return val


def generate_security_context_message(ben_status: str, dev_status: str) -> str:
    """
    Generates security signal message based on beneficiary and device status.
    Describes security signals only; NEVER says 'Fraud confirmed' or 'Fraud detected'.
    """
    if ben_status == "known" and dev_status == "known":
        return "Known beneficiary and known device."
    elif ben_status == "new" and dev_status == "known":
        return "New beneficiary detected."
    elif ben_status == "known" and dev_status == "new":
        return "New device detected."
    else:
        return "New beneficiary and new device detected."


# ============================================================================
# Phase 0 Public Endpoints (Preserved - Public)
# ============================================================================

@app.get("/")
def read_root():
    """
    Root endpoint for basic connectivity check.
    Publicly accessible.
    """
    return {
        "message": "Fraud Warning System API is running"
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint returning system status.
    Publicly accessible.
    """
    return {
        "status": "OK",
        "system": "Fraud Warning System"
    }


# ============================================================================
# Phase 3.5 Authentication Endpoints
# ============================================================================

@app.post("/api/auth/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user with email and password.
    Returns signed JWT access token and user information.
    """
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user or not user.password_hash or not user.password_salt:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(request.password, user.password_hash, user.password_salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Issue JWT token with email and user ID
    token = create_access_token(data={"sub": user.email, "user_id": user.id})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        }
    }


@app.get("/api/auth/me", response_model=UserInfo)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile info.
    Requires a valid JWT Bearer token.
    """
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
    }


# ============================================================================
# Phase 1 Data Layer Endpoints (Protected - Require Authentication)
# ============================================================================

@app.get("/api/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve all user records (Protected)."""
    users = db.query(models.User).all()
    return [user.to_dict() for user in users]


@app.get("/api/sms")
def get_sms_messages(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve all SMS message records (Protected)."""
    messages = db.query(models.SMSMessage).all()
    return [msg.to_dict() for msg in messages]


@app.get("/api/transactions")
def get_transactions(
    limit: Optional[int] = None,
    all_users: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Retrieve transaction records (Protected: scoped to authenticated user).
    Supports optional limit parameter and user isolation.
    """
    if all_users:
        query = db.query(models.Transaction)
    else:
        query = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)
    query = query.order_by(models.Transaction.timestamp.desc())
    if limit:
        query = query.limit(limit)
    transactions = query.all()
    return [tx.to_dict() for tx in transactions]


@app.get("/api/beneficiaries")
def get_beneficiaries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve all beneficiary records (Protected)."""
    beneficiaries = db.query(models.Beneficiary).all()
    return [b.to_dict() for b in beneficiaries]


@app.get("/api/devices")
def get_devices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve all registered device records (Protected)."""
    devices = db.query(models.Device).all()
    return [d.to_dict() for d in devices]


@app.get("/api/alerts")
def get_alerts(
    status: Optional[str] = None,
    all_users: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 7: Retrieve alert records (Protected: scoped to authenticated user).
    Supports optional status filtering (NEW, REVIEWED, DISMISSED).
    """
    if all_users:
        alerts = db.query(models.Alert).all()
        return [a.to_dict() for a in alerts]
    return get_user_alerts(db=db, user_id=current_user.id, status_filter=status)


@app.get("/api/alerts/{alert_id}")
def get_single_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 7: Retrieve single alert by ID.
    Enforces strict ownership: 403 Forbidden if not belonging to authenticated user.
    """
    try:
        alert = get_alert_by_id(db=db, user_id=current_user.id, alert_id=alert_id)
        return alert.to_dict()
    except AlertAccessForbiddenError as afe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(afe),
        )
    except AlertNotFoundError as anfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(anfe),
        )


@app.post("/api/alerts/{alert_id}/review")
def api_review_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 7: Mark alert as REVIEWED.
    Enforces strict ownership: 403 Forbidden if not belonging to authenticated user.
    """
    try:
        return review_alert(db=db, user_id=current_user.id, alert_id=alert_id, action="REVIEWED")
    except AlertAccessForbiddenError as afe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(afe),
        )
    except AlertNotFoundError as anfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(anfe),
        )


@app.post("/api/alerts/{alert_id}/dismiss")
def api_dismiss_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 7: Mark alert as DISMISSED.
    Enforces strict ownership: 403 Forbidden if not belonging to authenticated user.
    """
    try:
        return review_alert(db=db, user_id=current_user.id, alert_id=alert_id, action="DISMISSED")
    except AlertAccessForbiddenError as afe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(afe),
        )
    except AlertNotFoundError as anfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(anfe),
        )


@app.post("/api/alerts/{alert_id}/feedback")
def api_submit_alert_feedback(
    alert_id: int,
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 8: Submit or update persistent feedback for an alert.
    Allowed feedback: reviewed, useful, incorrect.
    Enforces strict ownership: 403 Forbidden if alert belongs to another user.
    """
    try:
        return submit_alert_feedback(
            db=db,
            user_id=current_user.id,
            alert_id=alert_id,
            feedback=request.feedback,
            notes=request.notes,
        )
    except AlertAccessForbiddenError as afe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(afe),
        )
    except AlertNotFoundError as anfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(anfe),
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )


@app.get("/api/alerts/{alert_id}/feedback")
def api_get_alert_feedback(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 8: Retrieve feedback for an alert.
    Enforces strict ownership: 403 Forbidden if alert belongs to another user.
    """
    try:
        return get_alert_feedback(
            db=db,
            user_id=current_user.id,
            alert_id=alert_id,
        )
    except AlertAccessForbiddenError as afe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(afe),
        )
    except AlertNotFoundError as anfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(anfe),
        )


@app.get("/api/stats")
def get_database_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve high-level summary counts from SQLite (Protected)."""
    return {
        "database": "connected",
        "users": db.query(models.User).count(),
        "sms_messages": db.query(models.SMSMessage).count(),
        "transactions": db.query(models.Transaction).count(),
        "beneficiaries": db.query(models.Beneficiary).count(),
        "devices": db.query(models.Device).count(),
        "alerts": db.query(models.Alert).count(),
    }


# ============================================================================
# Phase 2 ML SMS Prediction Endpoint (Protected)
# ============================================================================

@app.post("/api/sms/predict", response_model=SMSPredictionResponse)
def predict_sms(
    request: SMSRequest,
    current_user: models.User = Depends(get_current_user),
):
    """
    Analyzes an incoming SMS message text and classifies it as 'normal' or 'suspicious'.
    Protected: Requires valid JWT Bearer token.
    """
    try:
        result = sms_service.predict(request.message)
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing SMS classification: {str(e)}"
        )


# ============================================================================
# Phase 3 ML Transaction Anomaly Detection Endpoint (Protected)
# ============================================================================

@app.post("/api/transactions/analyze", response_model=TransactionAnalyzeResponse)
def analyze_transaction(
    request: TransactionAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Analyzes a transaction for anomalies using unsupervised Isolation Forest.
    Optionally evaluates security context signals (beneficiary/device) for the user.
    Protected: Requires valid JWT Bearer token.
    """
    try:
        raw_dict = request.model_dump(exclude={"beneficiary_identifier", "device_identifier"})
        result = transaction_service.analyze(raw_dict)

        ben_status = None
        dev_status = None
        context_parts = []

        if request.beneficiary_identifier:
            b_res = check_beneficiary(db, current_user.id, request.beneficiary_identifier)
            ben_status = b_res["beneficiary_status"]
            context_parts.append(f"{ben_status} beneficiary")

        if request.device_identifier:
            d_res = check_device(db, current_user.id, request.device_identifier)
            dev_status = d_res["device_status"]
            context_parts.append(f"{dev_status} device")

        if context_parts:
            context_desc = " and ".join(context_parts)
            if result["prediction"] == "anomalous":
                combined_msg = f"Transaction is anomalous and involves a {context_desc}."
            else:
                combined_msg = f"Transaction is normal with {context_desc}."
        else:
            combined_msg = result["message"]

        return {
            "prediction": result["prediction"],
            "anomaly_score": result["anomaly_score"],
            "beneficiary_status": ben_status,
            "device_status": dev_status,
            "message": combined_msg,
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing transaction: {str(e)}"
        )


# ============================================================================
# Phase 4 Security Signals: Beneficiary & Device Endpoints (Protected)
# ============================================================================

@app.post("/api/beneficiaries/check", response_model=BeneficiaryCheckResponse)
def api_check_beneficiary(
    request: BeneficiaryCheckRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Checks whether a beneficiary account identifier is known or new for the authenticated user.
    Protected: Enforces strict user isolation using current_user.id from JWT.
    """
    return check_beneficiary(
        db=db,
        user_id=current_user.id,
        account_identifier=request.account_identifier,
    )


@app.post("/api/devices/check", response_model=DeviceCheckResponse)
def api_check_device(
    request: DeviceCheckRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Checks whether a device identifier is known or new for the authenticated user.
    Protected: Enforces strict user isolation using current_user.id from JWT.
    """
    return check_device(
        db=db,
        user_id=current_user.id,
        device_identifier=request.device_identifier,
    )


@app.post("/api/security/context-check", response_model=SecurityContextCheckResponse)
def api_security_context_check(
    request: SecurityContextCheckRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Combined endpoint that checks both beneficiary and device security signals
    for the authenticated user.
    Protected: Uses JWT authenticated user ID only.
    """
    ben_result = check_beneficiary(
        db=db,
        user_id=current_user.id,
        account_identifier=request.beneficiary_identifier,
    )
    dev_result = check_device(
        db=db,
        user_id=current_user.id,
        device_identifier=request.device_identifier,
    )

    msg = generate_security_context_message(
        ben_result["beneficiary_status"],
        dev_result["device_status"],
    )

    return {
        "beneficiary_status": ben_result["beneficiary_status"],
        "beneficiary_id": ben_result["beneficiary_id"],
        "device_status": dev_result["device_status"],
        "device_id": dev_result["device_id"],
        "message": msg,
    }


# ============================================================================
# Phase 5 Security Signals: Time Correlation & URL Analysis Endpoints (Protected)
# ============================================================================

@app.post("/api/security/time-correlation", response_model=TimeCorrelationResponse)
def api_time_correlation(
    request: TimeCorrelationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Checks whether a transaction occurred within a configured time window (default 30 min)
    after a suspicious SMS message for the authenticated user.
    Protected: Uses JWT user ID only.
    """
    try:
        return check_time_correlation(
            db=db,
            user_id=current_user.id,
            transaction_time=request.transaction_time,
            sms_time=request.sms_time,
            window_minutes=request.window_minutes or 30,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating time correlation: {str(e)}",
        )


@app.post("/api/security/url-analysis", response_model=URLAnalysisResponse)
def api_url_analysis(
    request: URLAnalysisRequest,
    current_user: models.User = Depends(get_current_user),
):
    """
    Performs safe offline heuristic risk analysis of any URL present in the message text.
    Protected: Requires valid JWT. Does NOT visit or contact URLs over the network.
    """
    try:
        return analyze_url(request.message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing URL: {str(e)}",
        )


@app.post("/api/security/analyze", response_model=CombinedSecurityAnalyzeResponse)
def api_combined_security_analyze(
    request: CombinedSecurityAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Combined endpoint that analyzes both SMS text (URL risk) and temporal correlation
    between a suspicious SMS and the transaction time.
    Protected: Uses JWT authenticated user ID only.
    """
    try:
        # 1. Evaluate offline URL risk indicators
        url_result = analyze_url(request.message)

        # 2. Evaluate temporal correlation between suspicious SMS and transaction
        time_result = check_time_correlation(
            db=db,
            user_id=current_user.id,
            transaction_time=request.transaction_time,
            sms_time=request.sms_time,
            window_minutes=request.window_minutes or 30,
        )

        # 3. Generate descriptive contextual signal message (never claim fraud confirmed)
        signals_detected = []
        if time_result["time_correlation"]:
            signals_detected.append(
                f"Transaction occurred {time_result['time_difference_minutes']} min after suspicious SMS"
            )
        if url_result["url_found"] and url_result["risk_level"] in ("medium", "high"):
            signals_detected.append(
                f"{url_result['risk_level'].upper()}-risk URL pattern detected in message"
            )

        if signals_detected:
            msg = f"Security signals detected: {'; '.join(signals_detected)}."
        else:
            msg = "No significant time-correlation or high-risk URL security signals detected."

        return {
            "time_correlation": time_result["time_correlation"],
            "time_difference_minutes": time_result["time_difference_minutes"],
            "url_found": url_result["url_found"],
            "url_risk_level": url_result["risk_level"],
            "url_indicators": url_result["indicators"],
            "message": msg,
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing security signals: {str(e)}",
        )


@app.post("/api/security/risk-assessment", response_model=RiskAssessmentResponse)
def api_risk_assessment(
    request: RiskAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 6: Multi-Factor Risk Assessment Endpoint.
    Combines SMS scam classification, transaction anomaly detection, beneficiary status,
    device status, temporal correlation, and offline URL analysis.
    Protected: strictly scoped to the authenticated user from JWT.
    """
    try:
        tx_dict = request.transaction_data.model_dump() if request.transaction_data else None
        return evaluate_risk(
            db=db,
            user_id=current_user.id,
            sms_id=request.sms_id,
            transaction_id=request.transaction_id,
            sms_text=request.sms_text,
            transaction_data=tx_dict,
            beneficiary_identifier=request.beneficiary_identifier,
            device_identifier=request.device_identifier,
            transaction_time=request.transaction_time,
            window_minutes=request.window_minutes or 30,
        )
    except AccessForbiddenError as afe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(afe),
        )
    except RecordNotFoundError as rnfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(rnfe),
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating multi-factor risk: {str(e)}",
        )


@app.get("/api/security/timeline")
def api_security_timeline(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 7: Chronological Security & Activity Timeline.
    Aggregates historical SMS, transactions, beneficiaries, devices, and alerts
    strictly for the authenticated user.
    Clearly labels events where timestamps are unavailable.
    """
    try:
        return get_user_timeline(db=db, user_id=current_user.id, limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving security timeline: {str(e)}",
        )


@app.get("/api/dashboard/summary")
def api_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Phase 8: Real-time aggregated dashboard summary for authenticated user.
    Returns:
    - Assessment metrics & counts (total, low, medium, high)
    - Alerts metrics & feedback statistics
    - Recent alerts
    - Recent transactions
    - Recent activity timeline
    - Contextual advisory safety recommendations
    Protected: Strictly scoped to the authenticated user from JWT.
    """
    try:
        return get_dashboard_summary(db=db, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating dashboard summary: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
