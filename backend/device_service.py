from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import models


def check_device(
    db: Session,
    user_id: int,
    device_identifier: str,
) -> Dict[str, Any]:
    """
    Checks whether a device identifier belongs to the authenticated user's
    existing registered devices.

    Enforces strict user isolation: a device belonging to another user
    will NOT be considered known.

    Args:
        db (Session): SQLAlchemy database session.
        user_id (int): Authenticated user ID (extracted from JWT).
        device_identifier (str): Device identifier string.

    Returns:
        dict: {
            "device_status": "known" | "new",
            "device_id": int | None,
            "message": str
        }
    """
    clean_identifier = (device_identifier or "").strip()
    if not clean_identifier:
        return {
            "device_status": "new",
            "device_id": None,
            "message": "No device identifier provided.",
        }

    # Query strictly filtered by authenticated user_id
    device = (
        db.query(models.Device)
        .filter(
            models.Device.user_id == user_id,
            models.Device.device_identifier == clean_identifier,
        )
        .first()
    )

    if device:
        return {
            "device_status": "known",
            "device_id": device.id,
            "message": "This device has been previously used by the user.",
        }

    return {
        "device_status": "new",
        "device_id": None,
        "message": "This device has not been previously recorded for this user.",
    }
