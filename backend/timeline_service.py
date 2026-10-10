"""
Timeline Aggregator Service (Phase 7)
AI-Based Multi-Layer Fraud Early Warning System

Creates a chronological audit view using actual available timestamps across:
- SMS records
- Transactions
- Beneficiaries
- Devices
- Alerts

Strictly isolated to the authenticated user.
Clearly labels any event whose timestamp is unavailable.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

import models
from time_correlation_service import parse_datetime_input
from url_service import analyze_url


def get_user_timeline(
    db: Session,
    user_id: int,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Retrieves and chronologically orders all authentic historical security events
    for the authenticated user.

    Never fabricates events or timestamps.
    """
    events: List[Dict[str, Any]] = []

    # 1. SMS Messages
    sms_messages = db.query(models.SMSMessage).filter(models.SMSMessage.user_id == user_id).all()
    for sms in sms_messages:
        ts_obj = None
        ts_str = None
        if sms.received_at:
            try:
                ts_obj = parse_datetime_input(sms.received_at)
                ts_str = ts_obj.isoformat()
            except Exception:
                ts_obj = None

        url_res = analyze_url(sms.message_text)
        url_meta = {}
        if url_res.get("url_found"):
            url_meta = {
                "url": url_res["url"],
                "url_risk": url_res["risk_level"],
                "indicators": url_res["indicators"]
            }

        events.append({
            "event_id": f"sms_{sms.id}",
            "entity_type": "SMS",
            "event_type": "SMS_RECEIVED",
            "timestamp": ts_str,
            "timestamp_available": ts_obj is not None,
            "_sort_dt": ts_obj,
            "title": f"SMS from {sms.sender}",
            "description": sms.message_text,
            "severity": "HIGH" if sms.is_suspicious else "LOW",
            "metadata": {
                "sms_id": sms.id,
                "sender": sms.sender,
                "is_suspicious": sms.is_suspicious,
                **url_meta
            }
        })

    # 2. Transactions
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()
    for tx in transactions:
        ts_obj = None
        ts_str = None
        if tx.timestamp:
            try:
                ts_obj = parse_datetime_input(tx.timestamp)
                ts_str = ts_obj.isoformat()
            except Exception:
                ts_obj = None

        severity = "HIGH" if tx.amount >= 50000 else ("MEDIUM" if tx.amount >= 10000 else "LOW")
        events.append({
            "event_id": f"tx_{tx.id}",
            "entity_type": "TRANSACTION",
            "event_type": "TRANSACTION",
            "timestamp": ts_str,
            "timestamp_available": ts_obj is not None,
            "_sort_dt": ts_obj,
            "title": f"Transaction: ₹{tx.amount:,.2f} ({tx.transaction_type})",
            "description": f"Location: {tx.location or 'Unknown'} | Channel: {tx.transaction_type}",
            "severity": severity,
            "metadata": {
                "transaction_id": tx.id,
                "amount": tx.amount,
                "transaction_type": tx.transaction_type,
                "location": tx.location,
                "beneficiary_id": tx.beneficiary_id,
                "device_id": tx.device_id,
            }
        })

    # 3. Beneficiaries Added
    beneficiaries = db.query(models.Beneficiary).filter(models.Beneficiary.user_id == user_id).all()
    for ben in beneficiaries:
        ts_obj = None
        ts_str = None
        if ben.created_at:
            try:
                ts_obj = parse_datetime_input(ben.created_at)
                ts_str = ts_obj.isoformat()
            except Exception:
                ts_obj = None

        events.append({
            "event_id": f"ben_{ben.id}",
            "entity_type": "BENEFICIARY",
            "event_type": "BENEFICIARY_ADDED",
            "timestamp": ts_str,
            "timestamp_available": ts_obj is not None,
            "_sort_dt": ts_obj,
            "title": f"Beneficiary Registered: {ben.name}",
            "description": f"Account Identifier: {ben.account_identifier}",
            "severity": "INFO",
            "metadata": {
                "beneficiary_id": ben.id,
                "name": ben.name,
                "account_identifier": ben.account_identifier,
            }
        })

    # 4. Devices Registered
    devices = db.query(models.Device).filter(models.Device.user_id == user_id).all()
    for dev in devices:
        ts_obj = None
        ts_str = None
        if dev.first_seen:
            try:
                ts_obj = parse_datetime_input(dev.first_seen)
                ts_str = ts_obj.isoformat()
            except Exception:
                ts_obj = None

        events.append({
            "event_id": f"dev_{dev.id}",
            "entity_type": "DEVICE",
            "event_type": "DEVICE_REGISTERED",
            "timestamp": ts_str,
            "timestamp_available": ts_obj is not None,
            "_sort_dt": ts_obj,
            "title": f"Device Recognized: {dev.device_name}",
            "description": f"Fingerprint / Identifier: {dev.device_identifier}",
            "severity": "INFO",
            "metadata": {
                "device_id": dev.id,
                "device_name": dev.device_name,
                "device_identifier": dev.device_identifier,
            }
        })

    # 5. Security Alerts
    alerts = db.query(models.Alert).filter(models.Alert.user_id == user_id).all()
    for al in alerts:
        ts_obj = None
        ts_str = None
        if al.created_at:
            try:
                ts_obj = parse_datetime_input(al.created_at)
                ts_str = ts_obj.isoformat()
            except Exception:
                ts_obj = None

        events.append({
            "event_id": f"alert_{al.id}",
            "entity_type": "ALERT",
            "event_type": "ALERT_TRIGGERED",
            "timestamp": ts_str,
            "timestamp_available": ts_obj is not None,
            "_sort_dt": ts_obj,
            "title": f"Alert [{al.alert_type}]: {al.risk_level}",
            "description": al.message,
            "severity": al.risk_level,
            "metadata": {
                "alert_id": al.id,
                "alert_type": al.alert_type,
                "status": getattr(al, "status", "NEW") or "NEW",
            }
        })

    # Sort chronologically:
    # Items with timestamps sorted newest first; items without timestamp at the end
    def sort_key(item):
        dt = item.get("_sort_dt")
        if dt is not None:
            return (1, dt)
        return (0, datetime.min.replace(tzinfo=timezone.utc))

    events.sort(key=sort_key, reverse=True)

    # Clean up internal sort key
    for e in events:
        e.pop("_sort_dt", None)

    return events[:limit]
