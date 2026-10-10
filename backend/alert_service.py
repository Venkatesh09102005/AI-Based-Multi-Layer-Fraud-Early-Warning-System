"""
Alerts Management Service (Phase 7)
AI-Based Multi-Layer Fraud Early Warning System

Provides alert lifecycle management:
- Persisting rule-justified alerts from risk assessments
- Duplicate prevention for identical assessments
- User ownership validation and access protection
- Review and dismissal workflow
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

import models


class AlertAccessForbiddenError(Exception):
    """Raised when a user attempts to access or modify an alert belonging to another user."""
    pass


class AlertNotFoundError(Exception):
    """Raised when an alert ID does not exist."""
    pass


def get_user_alerts(
    db: Session,
    user_id: int,
    status_filter: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """
    Retrieves all alerts belonging strictly to the authenticated user, ordered chronologically (newest first).
    """
    query = db.query(models.Alert).filter(models.Alert.user_id == user_id)
    if status_filter:
        query = query.filter(models.Alert.status == status_filter.upper())
    
    alerts = query.order_by(models.Alert.created_at.desc()).limit(limit).all()
    return [a.to_dict() for a in alerts]


def get_alert_by_id(
    db: Session,
    user_id: int,
    alert_id: int,
) -> models.Alert:
    """
    Retrieves an alert by ID, validating that it belongs to the authenticated user.
    """
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise AlertNotFoundError(f"Alert with ID {alert_id} not found.")
    if alert.user_id != user_id:
        raise AlertAccessForbiddenError("Access forbidden: Alert does not belong to the authenticated user.")
    return alert


def review_alert(
    db: Session,
    user_id: int,
    alert_id: int,
    action: str = "REVIEWED",
) -> Dict[str, Any]:
    """
    Updates the status of an alert to REVIEWED or DISMISSED after verifying ownership.
    """
    alert = get_alert_by_id(db, user_id, alert_id)
    normalized_action = action.upper().strip()
    if normalized_action not in ("REVIEWED", "DISMISSED", "NEW"):
        normalized_action = "REVIEWED"

    alert.status = normalized_action
    db.commit()
    db.refresh(alert)
    return alert.to_dict()


def create_alert_from_assessment(
    db: Session,
    user_id: int,
    risk_assessment: Dict[str, Any],
) -> Tuple[Optional[models.Alert], bool]:
    """
    Generates and persists an alert from a Phase 6 risk assessment ONLY when justified by rules.

    Rules:
    - Alerts are generated ONLY for HIGH or MEDIUM risk levels (or risk_score >= 30).
    - LOW or INSUFFICIENT_DATA assessments do NOT generate security alerts.
    - Duplicate prevention: avoids creating a new alert if an identical alert
      exists for the user within the last 15 minutes.
    - Does NOT block transactions or contact external banks.

    Returns:
        tuple: (Alert instance or None, boolean indicating if newly created)
    """
    risk_level = risk_assessment.get("risk_level")
    risk_score = risk_assessment.get("risk_score")

    # Only generate alerts when justified
    if risk_level not in ("HIGH", "MEDIUM") or (risk_score is not None and risk_score < 30):
        return None, False

    # Determine alert type based on primary drivers
    signals = risk_assessment.get("signals", {})
    if signals.get("sms") == "suspicious" and signals.get("transaction") == "anomalous":
        alert_type = "MULTI_VECTOR_ATTACK"
    elif signals.get("time_correlation") == "correlated":
        alert_type = "CORRELATED_FRAUD_RISK"
    elif signals.get("transaction") == "anomalous":
        alert_type = "ANOMALOUS_TRANSACTION"
    elif signals.get("sms") == "suspicious":
        alert_type = "PHISHING_SMS"
    elif signals.get("url") in ("high", "medium"):
        alert_type = "HIGH_RISK_URL"
    else:
        alert_type = "SECURITY_SIGNAL"

    # Construct concise, evidence-based message
    score_str = f"Score: {risk_score}/100" if risk_score is not None else "High Risk"
    explanations = risk_assessment.get("explanations", [])
    primary_reason = explanations[0] if explanations else "Multiple suspicious indicators detected."
    alert_message = f"[{alert_type}] {risk_level} Risk ({score_str}). {primary_reason}"

    # Duplicate Prevention Check:
    # Look for existing alert for this user with same alert_type, risk_level within the last 15 minutes
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=15)
    existing_alert = (
        db.query(models.Alert)
        .filter(
            models.Alert.user_id == user_id,
            models.Alert.alert_type == alert_type,
            models.Alert.risk_level == risk_level,
            models.Alert.created_at >= cutoff_time,
        )
        .first()
    )

    if existing_alert:
        # Re-use existing alert to prevent duplicate clutter
        return existing_alert, False

    # Persist new alert
    new_alert = models.Alert(
        user_id=user_id,
        alert_type=alert_type,
        risk_level=risk_level,
        message=alert_message,
        status="NEW",
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert, True


VALID_FEEDBACK_VALUES = {"reviewed", "useful", "incorrect"}


def submit_alert_feedback(
    db: Session,
    user_id: int,
    alert_id: int,
    feedback: str,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Phase 8: Submits or updates user feedback for an existing alert.
    Allowed feedback values: reviewed, useful, incorrect.
    Enforces strict ownership: raises AlertAccessForbiddenError if alert does not belong to user.
    Safe duplicate behavior: updates the existing feedback record with newest feedback and timestamp.
    """
    alert = get_alert_by_id(db, user_id=user_id, alert_id=alert_id)

    normalized_feedback = feedback.strip().lower() if feedback else ""
    if normalized_feedback not in VALID_FEEDBACK_VALUES:
        raise ValueError(
            f"Invalid feedback '{feedback}'. Allowed values are: {', '.join(sorted(VALID_FEEDBACK_VALUES))}."
        )

    alert.feedback = normalized_feedback
    alert.feedback_at = datetime.now(timezone.utc)
    if notes is not None:
        alert.feedback_notes = notes.strip()

    # If alert is still NEW, advance to REVIEWED on feedback submission
    if getattr(alert, "status", "NEW") == "NEW":
        alert.status = "REVIEWED"

    db.commit()
    db.refresh(alert)
    return alert.to_dict()


def get_alert_feedback(
    db: Session,
    user_id: int,
    alert_id: int,
) -> Dict[str, Any]:
    """
    Phase 8: Retrieves feedback for an alert, verifying authenticated user ownership.
    """
    alert = get_alert_by_id(db, user_id=user_id, alert_id=alert_id)
    return {
        "alert_id": alert.id,
        "user_id": alert.user_id,
        "feedback": getattr(alert, "feedback", None),
        "feedback_at": alert.feedback_at.isoformat() if getattr(alert, "feedback_at", None) else None,
        "feedback_notes": getattr(alert, "feedback_notes", None),
        "status": alert.status,
    }
