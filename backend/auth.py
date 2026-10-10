import os
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
import models

# -----------------------------------------------------------------------------
# JWT & Hashing Configuration
# -----------------------------------------------------------------------------
# Configurable secret key via environment variable.
# Clearly documented development secret for local testing.
JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "fraud-warning-system-dev-secret-key-2026-phase35"
)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
PBKDF2_ITERATIONS = 100_000

# Security scheme for FastAPI OpenAPI docs and header extraction
http_bearer = HTTPBearer(auto_error=False)


# -----------------------------------------------------------------------------
# Password Hashing Functions (PBKDF2-HMAC-SHA256)
# -----------------------------------------------------------------------------
def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """
    Hashes a plaintext password using Python standard library hashlib.pbkdf2_hmac
    with a secure random salt.

    Returns:
        Tuple[str, str]: (password_hash_hex, password_salt_hex)
    """
    if salt is None:
        salt = secrets.token_hex(16)  # 32-character random hex salt

    key = hashlib.pbkdf2_hmac(
        hash_name="sha256",
        password=password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        iterations=PBKDF2_ITERATIONS,
    )
    return key.hex(), salt


def verify_password(password: str, password_hash: str, password_salt: str) -> bool:
    """
    Verifies a plaintext password against the stored password hash and salt.
    Uses constant-time comparison (secrets.compare_digest) to prevent timing attacks.
    """
    if not password or not password_hash or not password_salt:
        return False

    computed_hash, _ = hash_password(password, salt=password_salt)
    return secrets.compare_digest(computed_hash, password_hash)


# -----------------------------------------------------------------------------
# JWT Token Functions
# -----------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a signed JSON Web Token (JWT) with standard claims (sub, exp, iat).
    """
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({
        "exp": expire,
        "iat": now_utc,
    })
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT token using the configured secret key.
    Returns payload dictionary if valid, or None if expired or invalid.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


# -----------------------------------------------------------------------------
# FastAPI Authentication Dependency
# -----------------------------------------------------------------------------
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> models.User:
    """
    FastAPI dependency that extracts and validates the Bearer token from the
    Authorization header, decodes the JWT, and retrieves the current authenticated user.
    Raises HTTP 401 Unauthorized if token is missing, invalid, or expired.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Bearer token missing in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_email = payload.get("sub")
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject (email) is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(models.User).filter(models.User.email == user_email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
