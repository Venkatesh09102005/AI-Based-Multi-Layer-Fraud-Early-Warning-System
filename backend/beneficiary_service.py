from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import models


def check_beneficiary(
    db: Session,
    user_id: int,
    account_identifier: str,
) -> Dict[str, Any]:
    """
    Checks whether an account identifier belongs to the authenticated user's
    existing recorded beneficiaries.

    Enforces strict user isolation: a beneficiary belonging to another user
    will NOT be considered known.

    Args:
        db (Session): SQLAlchemy database session.
        user_id (int): Authenticated user ID (extracted from JWT).
        account_identifier (str): Beneficiary account identifier string.

    Returns:
        dict: {
            "beneficiary_status": "known" | "new",
            "beneficiary_id": int | None,
            "message": str
        }
    """
    clean_identifier = (account_identifier or "").strip()
    if not clean_identifier:
        return {
            "beneficiary_status": "new",
            "beneficiary_id": None,
            "message": "No beneficiary identifier provided.",
        }

    # Query strictly filtered by authenticated user_id
    beneficiary = (
        db.query(models.Beneficiary)
        .filter(
            models.Beneficiary.user_id == user_id,
            models.Beneficiary.account_identifier == clean_identifier,
        )
        .first()
    )

    if beneficiary:
        return {
            "beneficiary_status": "known",
            "beneficiary_id": beneficiary.id,
            "message": "This beneficiary has been used by the user before.",
        }

    return {
        "beneficiary_status": "new",
        "beneficiary_id": None,
        "message": "This beneficiary has not been previously recorded for this user.",
    }
