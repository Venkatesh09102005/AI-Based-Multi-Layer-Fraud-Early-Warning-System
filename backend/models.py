from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


def utc_now():
    """Helper to return current UTC datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(256), nullable=True)
    password_salt = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    sms_messages = relationship("SMSMessage", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    beneficiaries = relationship("Beneficiary", back_populates="user", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessmentRecord", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SMSMessage(Base):
    __tablename__ = "sms_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender = Column(String(50), nullable=False)
    message_text = Column(Text, nullable=False)
    received_at = Column(DateTime, default=utc_now, nullable=False)
    is_suspicious = Column(Boolean, default=False, nullable=False)

    # Relationship
    user = relationship("User", back_populates="sms_messages")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "sender": self.sender,
            "message_text": self.message_text,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "is_suspicious": self.is_suspicious,
        }


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    account_identifier = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="beneficiaries")
    transactions = relationship("Transaction", back_populates="beneficiary")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "account_identifier": self.account_identifier,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_identifier = Column(String(100), nullable=False)
    device_name = Column(String(100), nullable=False)
    first_seen = Column(DateTime, default=utc_now, nullable=False)
    last_seen = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="devices")
    transactions = relationship("Transaction", back_populates="device")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "device_identifier": self.device_identifier,
            "device_name": self.device_name,
            "first_seen": self.first_seen.isoformat() if self.first_seen else None,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
        }


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(50), nullable=False)  # UPI, CARD, BANK_TRANSFER, ATM
    beneficiary_id = Column(Integer, ForeignKey("beneficiaries.id"), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    location = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="transactions")
    beneficiary = relationship("Beneficiary", back_populates="transactions")
    device = relationship("Device", back_populates="transactions")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": self.amount,
            "transaction_type": self.transaction_type,
            "beneficiary_id": self.beneficiary_id,
            "device_id": self.device_id,
            "location": self.location,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)
    risk_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    message = Column(Text, nullable=False)
    status = Column(String(20), default="NEW", nullable=False)  # NEW, REVIEWED, DISMISSED
    feedback = Column(String(20), nullable=True)  # reviewed, useful, incorrect
    feedback_at = Column(DateTime, nullable=True)
    feedback_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationship
    user = relationship("User", back_populates="alerts")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "alert_type": self.alert_type,
            "risk_level": self.risk_level,
            "message": self.message,
            "status": getattr(self, "status", "NEW") or "NEW",
            "feedback": getattr(self, "feedback", None),
            "feedback_at": self.feedback_at.isoformat() if getattr(self, "feedback_at", None) else None,
            "feedback_notes": getattr(self, "feedback_notes", None),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RiskAssessmentRecord(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    risk_score = Column(Integer, nullable=True)  # None if INSUFFICIENT_DATA
    risk_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, INSUFFICIENT_DATA
    sms_text = Column(Text, nullable=True)
    transaction_amount = Column(Float, nullable=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="risk_assessments")
    alert = relationship("Alert")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "sms_text": self.sms_text,
            "transaction_amount": self.transaction_amount,
            "alert_id": self.alert_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

