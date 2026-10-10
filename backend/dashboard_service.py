"""
Dashboard Aggregator Service (Phase 8)
AI-Based Multi-Layer Fraud Early Warning System

Aggregates authenticated user metrics for:
- Risk assessments summary (total, LOW, MEDIUM, HIGH counts)
- Alerts lifecycle & feedback metrics (NEW, REVIEWED, DISMISSED, feedback totals)
- Recent alerts
- Recent transactions
- Recent activity timeline
- Contextual advisory safety recommendations

Strict user isolation: Derived exclusively from authenticated JWT user_id.
Never uses hardcoded fake data.
"""

from typing import Dict, Any, List
from sqlalchemy.orm import Session

import models
from timeline_service import get_user_timeline


def generate_contextual_safety_recommendations(
    alerts: List[models.Alert],
    assessments: List[models.RiskAssessmentRecord],
) -> List[Dict[str, str]]:
    """
    Generates contextual advisory safety recommendations tailored to the authenticated
    user's actual security signals and alert history.

    CRITICAL SAFETY:
    - Recommendations are strictly advisory.
    - System never claims fraud is proven.
    - System never blocks transactions or performs automated financial actions.
    """
    recommendations: List[Dict[str, str]] = []

    # Check for phishing SMS or credential threats
    has_sms_risk = any(
        a.alert_type in ("PHISHING_SMS", "MULTI_VECTOR_ATTACK") or "SMS" in (a.message or "")
        for a in alerts
    ) or any(
        rec.risk_level in ("HIGH", "MEDIUM") and rec.sms_text
        for rec in assessments
    )
    if has_sms_risk:
        recommendations.append({
            "category": "Credential Protection",
            "icon": "🔑",
            "title": "Never Disclose Confidential Credentials",
            "advice": (
                "Never share One-Time Passwords (OTPs), UPI PINs, passwords, or CVVs. "
                "Legitimate financial institutions and bank representatives will never ask for secret credentials."
            ),
            "priority": "HIGH",
        })

    # Check for high-risk / unverified URLs
    has_url_risk = any(
        a.alert_type in ("HIGH_RISK_URL", "MULTI_VECTOR_ATTACK") or "http" in (a.message or "").lower()
        for a in alerts
    ) or any(
        rec.sms_text and ("http" in rec.sms_text.lower() or "www." in rec.sms_text.lower())
        for rec in assessments
    )
    if has_url_risk:
        recommendations.append({
            "category": "Link Safety",
            "icon": "🔗",
            "title": "Do Not Open Unverified Message Links",
            "advice": (
                "Do not tap or click hyperlinks sent in unsolicited SMS or instant messages. "
                "Navigate independently to your bank or service provider using their official mobile app or verified domain."
            ),
            "priority": "HIGH",
        })

    # Check for anomalous transaction activity
    has_tx_risk = any(
        a.alert_type in ("ANOMALOUS_TRANSACTION", "CORRELATED_FRAUD_RISK", "MULTI_VECTOR_ATTACK")
        for a in alerts
    ) or any(
        rec.transaction_amount and rec.risk_level in ("HIGH", "MEDIUM")
        for rec in assessments
    )
    if has_tx_risk:
        recommendations.append({
            "category": "Transaction Monitoring",
            "icon": "💳",
            "title": "Verify Unexpected Financial Activity",
            "advice": (
                "If you observe unexpected account activity or anomalous transfers, contact your bank "
                "immediately using the verified customer care telephone number on the back of your payment card."
            ),
            "priority": "MEDIUM",
        })

    # Check for new beneficiary or device events
    has_context_risk = any(
        "beneficiary" in (a.message or "").lower() or "device" in (a.message or "").lower()
        for a in alerts
    )
    if has_context_risk:
        recommendations.append({
            "category": "Payee & Device Security",
            "icon": "👤",
            "title": "Double-Check New Payees and Devices",
            "advice": (
                "Before authorizing payments to newly registered beneficiaries, verify their account or VPA "
                "details through a trusted secondary channel. Ensure all device logins originate from hardware you control."
            ),
            "priority": "MEDIUM",
        })

    # Baseline security hygiene
    recommendations.append({
        "category": "General Security",
        "icon": "🛡️",
        "title": "Maintain Continuous Security Hygiene",
        "advice": (
            "Keep Multi-Factor Authentication (MFA) enabled across your banking and email accounts. "
            "Regularly inspect connected devices and review monthly account statements."
        ),
        "priority": "LOW",
    })

    return recommendations


def get_dashboard_summary(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Retrieves a complete real-time dashboard summary strictly for the authenticated user.
    """
    # 1. Risk Assessments Metrics & Recent Records
    assessments_query = (
        db.query(models.RiskAssessmentRecord)
        .filter(models.RiskAssessmentRecord.user_id == user_id)
    )
    total_assessments = assessments_query.count()
    low_assessments = assessments_query.filter(models.RiskAssessmentRecord.risk_level == "LOW").count()
    medium_assessments = assessments_query.filter(models.RiskAssessmentRecord.risk_level == "MEDIUM").count()
    high_assessments = assessments_query.filter(models.RiskAssessmentRecord.risk_level == "HIGH").count()
    insufficient_assessments = assessments_query.filter(models.RiskAssessmentRecord.risk_level == "INSUFFICIENT_DATA").count()

    recent_assessments_objs = (
        assessments_query
        .order_by(models.RiskAssessmentRecord.created_at.desc())
        .limit(5)
        .all()
    )
    recent_assessments = [r.to_dict() for r in recent_assessments_objs]

    # 2. Alerts Metrics & Recent Records
    alerts_query = db.query(models.Alert).filter(models.Alert.user_id == user_id)
    total_alerts = alerts_query.count()
    new_alerts = alerts_query.filter(models.Alert.status == "NEW").count()
    reviewed_alerts = alerts_query.filter(models.Alert.status == "REVIEWED").count()
    dismissed_alerts = alerts_query.filter(models.Alert.status == "DISMISSED").count()

    # Feedback metrics
    useful_feedback_count = alerts_query.filter(models.Alert.feedback == "useful").count()
    incorrect_feedback_count = alerts_query.filter(models.Alert.feedback == "incorrect").count()
    reviewed_feedback_count = alerts_query.filter(models.Alert.feedback == "reviewed").count()

    recent_alerts_objs = alerts_query.order_by(models.Alert.created_at.desc()).limit(5).all()
    recent_alerts = [a.to_dict() for a in recent_alerts_objs]

    # 3. User Transactions & Recent Records
    transactions_query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id)
    total_transactions = transactions_query.count()
    recent_transactions_objs = (
        transactions_query
        .order_by(models.Transaction.timestamp.desc())
        .limit(5)
        .all()
    )
    recent_transactions = [t.to_dict() for t in recent_transactions_objs]

    # 4. Activity & Fraud Timeline (top 6 items)
    recent_timeline = get_user_timeline(db=db, user_id=user_id, limit=6)

    # 5. Contextual Safety Recommendations
    safety_recommendations = generate_contextual_safety_recommendations(
        alerts=recent_alerts_objs,
        assessments=recent_assessments_objs,
    )

    return {
        "metrics": {
            "total_assessments": total_assessments,
            "low_assessments": low_assessments,
            "medium_assessments": medium_assessments,
            "high_assessments": high_assessments,
            "insufficient_assessments": insufficient_assessments,
            "total_alerts": total_alerts,
            "new_alerts": new_alerts,
            "reviewed_alerts": reviewed_alerts,
            "dismissed_alerts": dismissed_alerts,
            "total_transactions": total_transactions,
            "feedback_metrics": {
                "useful": useful_feedback_count,
                "incorrect": incorrect_feedback_count,
                "reviewed": reviewed_feedback_count,
                "total_with_feedback": useful_feedback_count + incorrect_feedback_count + reviewed_feedback_count,
            },
        },
        "recent_alerts": recent_alerts,
        "recent_transactions": recent_transactions,
        "recent_timeline": recent_timeline,
        "recent_assessments": recent_assessments,
        "safety_recommendations": safety_recommendations,
        "disclaimer": (
            "Safety recommendations and dashboard metrics are advisory early-warning indicators only. "
            "Risk scores do not constitute verified proof of fraud or financial blockades."
        ),
    }
