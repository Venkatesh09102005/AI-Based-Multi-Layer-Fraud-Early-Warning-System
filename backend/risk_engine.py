"""
Risk Engine Service (Phase 6)
AI-Based Multi-Layer Fraud Early Warning System

Provides transparent, rule-based multi-factor risk scoring, evidence-based
explanations, and contextual safety recommendations.

CRITICAL SAFETY PRINCIPLES:
- Risk scores are heuristic early-warning indicators, NOT verified fraud probabilities.
- Never claims "Fraud confirmed" or "Fraud proven".
- URL analysis is strictly offline with zero external network requests.
- Strict user isolation: strictly accesses authenticated user's records.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session

import models
from sms_service import sms_service
from transaction_service import transaction_service
from beneficiary_service import check_beneficiary
from device_service import check_device
from time_correlation_service import check_time_correlation, parse_datetime_input
from url_service import analyze_url

# Risk Level Thresholds (Configurable Heuristic Boundaries)
SCORE_THRESHOLDS = {
    "LOW_MAX": 29,       # 0 - 29: LOW
    "MEDIUM_MAX": 59,    # 30 - 59: MEDIUM
    "HIGH_MAX": 100,     # 60 - 100: HIGH
}

# Signal Weights
SIGNAL_WEIGHTS = {
    "sms_suspicious": 25,
    "transaction_anomalous": 30,
    "time_correlation": 25,
    "new_beneficiary": 15,
    "new_device": 10,
    "url_high": 20,
    "url_medium": 10,
}

DISCLAIMER_TEXT = (
    "This assessment is a rule-based heuristic early-warning risk indicator and does NOT "
    "constitute proof of fraud, financial advice, or automated transaction blocking."
)


class AccessForbiddenError(Exception):
    """Raised when an authenticated user attempts to access another user's record."""
    pass


class RecordNotFoundError(Exception):
    """Raised when a referenced record does not exist."""
    pass


def evaluate_risk(
    db: Session,
    user_id: int,
    sms_id: Optional[int] = None,
    transaction_id: Optional[int] = None,
    sms_text: Optional[str] = None,
    transaction_data: Optional[Dict[str, Any]] = None,
    beneficiary_identifier: Optional[str] = None,
    device_identifier: Optional[str] = None,
    transaction_time: Optional[Union[str, datetime]] = None,
    window_minutes: int = 30,
) -> Dict[str, Any]:
    """
    Evaluates multi-factor risk for the authenticated user combining:
    1. SMS scam prediction
    2. Transaction anomaly detection
    3. New beneficiary status
    4. New device status
    5. Time correlation between suspicious SMS and transaction
    6. URL risk indicators (offline only)

    Enforces strict user isolation. Clamps score to [0, 100].
    Returns INSUFFICIENT_DATA if no primary event (neither SMS nor Transaction) is provided.
    """
    signals = {
        "sms": "not_available",
        "transaction": "not_available",
        "beneficiary": "not_available",
        "device": "not_available",
        "time_correlation": "not_available",
        "url": "not_available",
    }
    explanations: List[str] = []
    recommended_actions: List[str] = []
    missing_signals: List[str] = []

    # -------------------------------------------------------------------------
    # 1. Resolve and Evaluate SMS Signal
    # -------------------------------------------------------------------------
    sms_record: Optional[models.SMSMessage] = None
    resolved_sms_text: Optional[str] = None
    sms_timestamp: Optional[datetime] = None

    if sms_id is not None:
        sms_record = db.query(models.SMSMessage).filter(models.SMSMessage.id == sms_id).first()
        if not sms_record:
            raise RecordNotFoundError(f"SMS record with ID {sms_id} not found.")
        if sms_record.user_id != user_id:
            raise AccessForbiddenError("Access forbidden: SMS record does not belong to the authenticated user.")
        resolved_sms_text = sms_record.message_text
        sms_timestamp = parse_datetime_input(sms_record.received_at)
    elif sms_text and sms_text.strip():
        resolved_sms_text = sms_text.strip()

    sms_pred_result = None
    if resolved_sms_text:
        try:
            sms_pred_result = sms_service.predict(resolved_sms_text)
            pred = sms_pred_result["prediction"]
            conf = sms_pred_result["confidence"]
            signals["sms"] = pred  # "suspicious" or "normal"
            if pred == "suspicious":
                explanations.append(
                    f"The SMS model classified the message as suspicious (confidence: {round(conf * 100, 1)}%)."
                )
            else:
                explanations.append(
                    f"The SMS model classified the message as normal (confidence: {round(conf * 100, 1)}%)."
                )
        except Exception as e:
            signals["sms"] = "not_available"
            missing_signals.append(f"SMS classification unavailable ({e})")
    else:
        missing_signals.append("No SMS message provided for evaluation")

    # -------------------------------------------------------------------------
    # 2. Resolve and Evaluate URL Indicators (Safe Offline)
    # -------------------------------------------------------------------------
    url_analysis_result = None
    if resolved_sms_text:
        url_analysis_result = analyze_url(resolved_sms_text)
        if url_analysis_result["url_found"]:
            signals["url"] = url_analysis_result["risk_level"]  # "high", "medium", "low"
            if url_analysis_result["risk_level"] in ("high", "medium"):
                inds_str = ", ".join(url_analysis_result["indicators"])
                explanations.append(
                    f"The SMS contains a URL with offline risk indicators: {inds_str}."
                )
            else:
                explanations.append("The SMS contains a URL with low offline risk indicators.")
        else:
            signals["url"] = "not_available"
    else:
        signals["url"] = "not_available"

    # -------------------------------------------------------------------------
    # 3. Resolve and Evaluate Transaction Signal
    # -------------------------------------------------------------------------
    tx_record: Optional[models.Transaction] = None
    resolved_tx_data: Optional[Dict[str, Any]] = None

    if transaction_id is not None:
        tx_record = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
        if not tx_record:
            raise RecordNotFoundError(f"Transaction record with ID {transaction_id} not found.")
        if tx_record.user_id != user_id:
            raise AccessForbiddenError("Access forbidden: Transaction record does not belong to the authenticated user.")

        tx_dt = parse_datetime_input(tx_record.timestamp)
        resolved_tx_data = {
            "amount": tx_record.amount,
            "transaction_type": tx_record.transaction_type,
            "hour": tx_dt.hour,
            "day_of_week": tx_dt.weekday(),
            "location": tx_record.location or "Unknown",
            "beneficiary_id": tx_record.beneficiary_id,
            "device_id": tx_record.device_id,
        }
        if transaction_time is None:
            transaction_time = tx_dt

        # Resolve beneficiary and device from relations if not explicitly provided
        if not beneficiary_identifier and tx_record.beneficiary:
            beneficiary_identifier = tx_record.beneficiary.account_identifier
        if not device_identifier and tx_record.device:
            device_identifier = tx_record.device.device_identifier

    elif transaction_data and isinstance(transaction_data, dict):
        resolved_tx_data = transaction_data
        if not beneficiary_identifier and "beneficiary_identifier" in transaction_data:
            beneficiary_identifier = transaction_data.get("beneficiary_identifier")
        if not device_identifier and "device_identifier" in transaction_data:
            device_identifier = transaction_data.get("device_identifier")
        if transaction_time is None and "transaction_time" in transaction_data:
            transaction_time = transaction_data.get("transaction_time")

    tx_pred_result = None
    if resolved_tx_data:
        try:
            tx_pred_result = transaction_service.analyze(resolved_tx_data)
            pred = tx_pred_result["prediction"]
            score = tx_pred_result["anomaly_score"]
            signals["transaction"] = pred  # "anomalous" or "normal"
            if pred == "anomalous":
                explanations.append(
                    f"The transaction model classified this transaction as anomalous (isolation score: {score})."
                )
            else:
                explanations.append(
                    f"The transaction model classified this transaction as normal (isolation score: {score})."
                )
        except Exception as e:
            signals["transaction"] = "not_available"
            missing_signals.append(f"Transaction analysis unavailable ({e})")
    else:
        missing_signals.append("No transaction details provided for evaluation")

    # -------------------------------------------------------------------------
    # 4. Resolve Beneficiary & Device Signals
    # -------------------------------------------------------------------------
    if beneficiary_identifier and beneficiary_identifier.strip():
        ben_res = check_beneficiary(db, user_id, beneficiary_identifier.strip())
        signals["beneficiary"] = ben_res["beneficiary_status"]
        if ben_res["beneficiary_status"] == "new":
            explanations.append(
                f"The beneficiary ('{beneficiary_identifier.strip()}') is new for this user account."
            )
        else:
            explanations.append(
                f"The beneficiary ('{beneficiary_identifier.strip()}') is previously recognized for this user."
            )
    else:
        signals["beneficiary"] = "not_available"
        missing_signals.append("Beneficiary identifier not provided")

    if device_identifier and device_identifier.strip():
        dev_res = check_device(db, user_id, device_identifier.strip())
        signals["device"] = dev_res["device_status"]
        if dev_res["device_status"] == "new":
            explanations.append(
                f"The device ('{device_identifier.strip()}') is new for this user account."
            )
        else:
            explanations.append(
                f"The device ('{device_identifier.strip()}') is previously recognized for this user."
            )
    else:
        signals["device"] = "not_available"
        missing_signals.append("Device identifier not provided")

    # -------------------------------------------------------------------------
    # 5. Resolve Time Correlation Signal
    # -------------------------------------------------------------------------
    if transaction_time:
        try:
            time_res = check_time_correlation(
                db=db,
                user_id=user_id,
                transaction_time=transaction_time,
                sms_time=sms_timestamp,
                window_minutes=window_minutes,
            )
            if time_res["time_correlation"]:
                signals["time_correlation"] = "correlated"
                diff_m = time_res["time_difference_minutes"]
                explanations.append(
                    f"A transaction occurred within {diff_m} minutes of a suspicious SMS."
                )
            else:
                signals["time_correlation"] = "not_correlated"
                explanations.append(
                    "No suspicious SMS was observed within the correlation window before the transaction."
                )
        except Exception as e:
            signals["time_correlation"] = "not_available"
            missing_signals.append(f"Time correlation check unavailable ({e})")
    else:
        signals["time_correlation"] = "not_available"
        missing_signals.append("Transaction timestamp not provided for time correlation")

    # -------------------------------------------------------------------------
    # 6. Check for Insufficient Data Condition
    # -------------------------------------------------------------------------
    # If neither SMS nor Transaction details were evaluable, do not compute a misleading score
    primary_signals_present = (signals["sms"] != "not_available") or (signals["transaction"] != "not_available")
    if not primary_signals_present:
        return {
            "risk_score": None,
            "risk_level": "INSUFFICIENT_DATA",
            "signals": signals,
            "explanations": [
                "Insufficient data: At least one primary event (SMS message or transaction details) is required to calculate a fraud risk score."
            ],
            "recommended_actions": [
                "Provide transaction details or message content to perform a comprehensive multi-factor risk assessment."
            ],
            "disclaimer": DISCLAIMER_TEXT,
            "evaluated_signals_count": sum(1 for v in signals.values() if v != "not_available"),
            "missing_signals": missing_signals,
        }

    # -------------------------------------------------------------------------
    # 7. Compute Rule-Based Risk Score
    # -------------------------------------------------------------------------
    score = 0

    # SMS contribution
    if signals["sms"] == "suspicious":
        score += SIGNAL_WEIGHTS["sms_suspicious"]

    # Transaction anomaly contribution
    if signals["transaction"] == "anomalous":
        score += SIGNAL_WEIGHTS["transaction_anomalous"]

    # Time correlation contribution
    if signals["time_correlation"] == "correlated":
        score += SIGNAL_WEIGHTS["time_correlation"]

    # Beneficiary contribution
    if signals["beneficiary"] == "new":
        score += SIGNAL_WEIGHTS["new_beneficiary"]

    # Device contribution
    if signals["device"] == "new":
        score += SIGNAL_WEIGHTS["new_device"]

    # URL risk contribution (with de-duplication against SMS text)
    if signals["url"] == "high":
        if signals["sms"] == "suspicious":
            # Cap combined SMS + URL contribution to avoid double-counting text content
            score += 10
        else:
            score += SIGNAL_WEIGHTS["url_high"]
    elif signals["url"] == "medium":
        score += SIGNAL_WEIGHTS["url_medium"]

    # Clamp final score strictly to [0, 100]
    clamped_score = max(0, min(100, round(score)))

    # Determine Risk Level from configured thresholds
    if clamped_score <= SCORE_THRESHOLDS["LOW_MAX"]:
        risk_level = "LOW"
    elif clamped_score <= SCORE_THRESHOLDS["MEDIUM_MAX"]:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # -------------------------------------------------------------------------
    # 8. Construct Transparent Signal Breakdown & Safety Recommendations
    # -------------------------------------------------------------------------
    sms_pts = SIGNAL_WEIGHTS["sms_suspicious"] if signals["sms"] == "suspicious" else 0
    tx_pts = SIGNAL_WEIGHTS["transaction_anomalous"] if signals["transaction"] == "anomalous" else 0
    tc_pts = SIGNAL_WEIGHTS["time_correlation"] if signals["time_correlation"] == "correlated" else 0
    ben_pts = SIGNAL_WEIGHTS["new_beneficiary"] if signals["beneficiary"] == "new" else 0
    dev_pts = SIGNAL_WEIGHTS["new_device"] if signals["device"] == "new" else 0
    if signals["url"] == "high":
        url_pts = 10 if signals["sms"] == "suspicious" else SIGNAL_WEIGHTS["url_high"]
    elif signals["url"] == "medium":
        url_pts = SIGNAL_WEIGHTS["url_medium"]
    else:
        url_pts = 0

    signal_breakdown = {
        "sms": {
            "status": signals["sms"],
            "points": sms_pts,
            "influence": "High Risk" if sms_pts > 0 else ("Safe / Benign" if signals["sms"] == "normal" else "Missing Information"),
            "is_missing": signals["sms"] == "not_available",
            "rationale": (
                f"TF-IDF + Logistic Regression classified the message as suspicious (+{sms_pts} pts)."
                if signals["sms"] == "suspicious"
                else (
                    "SMS patterns correspond to standard benign communication (+0 pts)."
                    if signals["sms"] == "normal"
                    else "No SMS message was provided. Not evaluated; cannot be assumed safe."
                )
            ),
        },
        "transaction": {
            "status": signals["transaction"],
            "points": tx_pts,
            "influence": "High Risk" if tx_pts > 0 else ("Safe / Expected" if signals["transaction"] == "normal" else "Missing Information"),
            "is_missing": signals["transaction"] == "not_available",
            "rationale": (
                f"Isolation Forest identified transaction as an anomaly outlier (+{tx_pts} pts)."
                if signals["transaction"] == "anomalous"
                else (
                    "Transaction values align with expected historical distribution (+0 pts)."
                    if signals["transaction"] == "normal"
                    else "No transaction details were provided. Not evaluated; cannot be assumed safe."
                )
            ),
        },
        "beneficiary": {
            "status": signals["beneficiary"],
            "points": ben_pts,
            "influence": "Contextual Signal" if ben_pts > 0 else ("Recognized" if signals["beneficiary"] == "known" else "Missing Information"),
            "is_missing": signals["beneficiary"] == "not_available",
            "rationale": (
                f"Beneficiary is new/unrecognized for this user account (+{ben_pts} pts)."
                if signals["beneficiary"] == "new"
                else (
                    "Beneficiary account previously recognized for this user (+0 pts)."
                    if signals["beneficiary"] == "known"
                    else "No beneficiary identifier provided. Not evaluated."
                )
            ),
        },
        "device": {
            "status": signals["device"],
            "points": dev_pts,
            "influence": "Contextual Signal" if dev_pts > 0 else ("Recognized" if signals["device"] == "known" else "Missing Information"),
            "is_missing": signals["device"] == "not_available",
            "rationale": (
                f"Device identifier is newly observed for this user account (+{dev_pts} pts)."
                if signals["device"] == "new"
                else (
                    "Device identifier previously registered to this user (+0 pts)."
                    if signals["device"] == "known"
                    else "No device identifier provided. Not evaluated."
                )
            ),
        },
        "time_correlation": {
            "status": signals["time_correlation"],
            "points": tc_pts,
            "influence": "Temporal Closeness" if tc_pts > 0 else ("No Temporal Closeness" if signals["time_correlation"] == "not_correlated" else "Missing Information"),
            "is_missing": signals["time_correlation"] == "not_available",
            "rationale": (
                f"Transaction occurred within the 30-minute window of a suspicious SMS (+{tc_pts} pts)."
                if signals["time_correlation"] == "correlated"
                else (
                    "No suspicious SMS was observed within the correlation window (+0 pts)."
                    if signals["time_correlation"] == "not_correlated"
                    else "Transaction timestamp not provided for time correlation."
                )
            ),
        },
        "url": {
            "status": signals["url"],
            "points": url_pts,
            "influence": "Heuristic Risk" if url_pts > 0 else ("Low Risk / No URL" if signals["url"] == "low" else "Missing Information"),
            "is_missing": signals["url"] == "not_available",
            "rationale": (
                f"Offline heuristic analysis detected high-risk URL indicators (+{url_pts} pts)."
                if signals["url"] == "high"
                else (
                    f"Offline heuristic analysis detected moderate risk URL indicators (+{url_pts} pts)."
                    if signals["url"] == "medium"
                    else (
                        "Standard HTTPS URL with no suspicious heuristic indicators detected (+0 pts)."
                        if signals["url"] == "low"
                        else "No URL present in message text."
                    )
                )
            ),
        },
    }

    if signals["sms"] == "suspicious" or signals["url"] in ("high", "medium"):
        recommended_actions.append(
            "Do not click on links, download attachments, or reply to unsolicited messages claiming urgent account actions."
        )
    if signals["url"] in ("high", "medium"):
        recommended_actions.append(
            "Do not open the detected link; navigate independently to your bank or provider via their official verified app or website."
        )
    if signals["sms"] == "suspicious":
        recommended_actions.append(
            "Never share One-Time Passwords (OTPs), UPI PINs, CVVs, or login credentials with anyone, even if they claim to represent your bank."
        )
    if signals["time_correlation"] == "correlated":
        recommended_actions.append(
            "Exercise extreme caution: high temporal proximity between a suspicious SMS and this transaction suggests potential social engineering."
        )
    if signals["beneficiary"] == "new" or signals["transaction"] == "anomalous":
        recommended_actions.append(
            "Verify the recipient's identity and payment details through an independent, trusted communication channel before releasing funds."
        )
    if signals["device"] == "new":
        recommended_actions.append(
            "Confirm that this activity originated from an authorized device you recognize and control."
        )

    # Fallback recommendations if clean
    if not recommended_actions:
        recommended_actions.append(
            "No high-risk indicators observed. Continue regular security vigilance and monitor your account statements."
        )
    else:
        recommended_actions.append(
            "If you suspect unauthorized transactions, immediately contact your bank using the official customer support number on the back of your card."
        )

    # -------------------------------------------------------------------------
    # 9. Alert Generation & Persistence (Phase 7)
    # -------------------------------------------------------------------------
    alert_id = None
    alert_created = False
    if db is not None:
        try:
            from alert_service import create_alert_from_assessment
            assessment_summary = {
                "risk_score": clamped_score,
                "risk_level": risk_level,
                "signals": signals,
                "explanations": explanations,
            }
            alert_obj, created_flag = create_alert_from_assessment(db, user_id, assessment_summary)
            if alert_obj:
                alert_id = alert_obj.id
                alert_created = created_flag
        except Exception as alert_err:
            print(f"[risk_engine] Alert persistence note: {alert_err}")

        # Phase 8: Record assessment history for dashboard analytics
        try:
            tx_amount = resolved_tx_data.get("amount") if resolved_tx_data else None
            record = models.RiskAssessmentRecord(
                user_id=user_id,
                risk_score=clamped_score,
                risk_level=risk_level,
                sms_text=resolved_sms_text,
                transaction_amount=float(tx_amount) if tx_amount is not None else None,
                alert_id=alert_id,
                created_at=datetime.now(timezone.utc),
            )
            db.add(record)
            db.commit()
        except Exception as rec_err:
            print(f"[risk_engine] Assessment history persistence note: {rec_err}")

    evaluated_count = sum(1 for v in signals.values() if v != "not_available")

    return {
        "risk_score": clamped_score,
        "risk_level": risk_level,
        "signals": signals,
        "signal_breakdown": signal_breakdown,
        "explanations": explanations,
        "recommended_actions": recommended_actions,
        "disclaimer": DISCLAIMER_TEXT,
        "evaluated_signals_count": evaluated_count,
        "missing_signals": missing_signals,
        "alert_id": alert_id,
        "alert_created": alert_created,
    }
