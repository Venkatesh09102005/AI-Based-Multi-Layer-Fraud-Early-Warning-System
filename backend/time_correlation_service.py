from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Union
from sqlalchemy.orm import Session
import models


def parse_datetime_input(dt_val: Union[datetime, str]) -> datetime:
    """
    Parses a string or datetime object into a normalized UTC-aware datetime.
    """
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val.astimezone(timezone.utc)

    # String parsing
    clean_str = str(dt_val).strip()
    try:
        # Replace trailing 'Z' if present for fromisoformat compatibility
        if clean_str.endswith("Z"):
            clean_str = clean_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception as e:
        raise ValueError(f"Invalid timestamp format '{dt_val}'. Use ISO 8601 (e.g. '2026-10-07T10:12:00'). Error: {e}")


def check_time_correlation(
    db: Session,
    user_id: int,
    transaction_time: Union[datetime, str],
    sms_time: Optional[Union[datetime, str]] = None,
    window_minutes: int = 30,
) -> Dict[str, Any]:
    """
    Evaluates temporal correlation between a suspicious SMS and a subsequent transaction.

    Rules:
    - Analyzes whether a transaction occurred within `window_minutes` (default 30)
      after a suspicious SMS message belonging to the authenticated user.
    - Time correlation is a contextual security signal and does NOT prove fraud.

    Args:
        db (Session): SQLAlchemy database session.
        user_id (int): Authenticated user ID (extracted from JWT).
        transaction_time (datetime | str): Timestamp of the transaction.
        sms_time (datetime | str, optional): Explicit SMS timestamp for ad-hoc comparison.
        window_minutes (int): Correlation window in minutes (default 30).

    Returns:
        dict: {
            "time_correlation": bool,
            "time_difference_minutes": int | None,
            "related_sms_id": int | None,
            "message": str
        }
    """
    tx_dt = parse_datetime_input(transaction_time)

    # Path 1: Explicit SMS timestamp supplied (e.g. in test or ad-hoc analysis)
    if sms_time is not None:
        sms_dt = parse_datetime_input(sms_time)
        diff_seconds = (tx_dt - sms_dt).total_seconds()
        diff_minutes = round(diff_seconds / 60.0)

        # Correlation triggers only if transaction occurred at or after the SMS within the window
        if 0 <= diff_minutes <= window_minutes:
            return {
                "time_correlation": True,
                "time_difference_minutes": diff_minutes,
                "related_sms_id": None,
                "message": "A transaction occurred shortly after a suspicious SMS.",
            }
        else:
            return {
                "time_correlation": False,
                "time_difference_minutes": None,
                "related_sms_id": None,
                "message": "No suspicious SMS was closely followed by this transaction.",
            }

    # Path 2: Query database for suspicious SMS messages belonging to the user
    # Retrieve all suspicious SMS received on or before the transaction time
    suspicious_sms_list = (
        db.query(models.SMSMessage)
        .filter(
            models.SMSMessage.user_id == user_id,
            models.SMSMessage.is_suspicious == True,
        )
        .all()
    )

    closest_sms = None
    min_diff_minutes = None

    for sms in suspicious_sms_list:
        sms_received_dt = parse_datetime_input(sms.received_at)
        diff_seconds = (tx_dt - sms_received_dt).total_seconds()
        diff_minutes = round(diff_seconds / 60.0)

        if 0 <= diff_minutes <= window_minutes:
            if min_diff_minutes is None or diff_minutes < min_diff_minutes:
                min_diff_minutes = diff_minutes
                closest_sms = sms

    if closest_sms is not None and min_diff_minutes is not None:
        return {
            "time_correlation": True,
            "time_difference_minutes": min_diff_minutes,
            "related_sms_id": closest_sms.id,
            "message": "A transaction occurred shortly after a suspicious SMS.",
        }

    return {
        "time_correlation": False,
        "time_difference_minutes": None,
        "related_sms_id": None,
        "message": "No suspicious SMS was closely followed by this transaction.",
    }
