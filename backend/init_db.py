import sys
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

# Add backend directory to sys.path so script can be run standalone
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import engine, Base, DATABASE_FILE, SessionLocal
import models
from auth import hash_password


def migrate_database_schema():
    """
    Safely migrates the SQLite schema without dropping tables or losing existing data.
    Adds password_hash and password_salt columns to users table if not already present.
    """
    if not DATABASE_FILE.exists():
        return

    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = [row[1] for row in cursor.fetchall()]

        if existing_cols and "password_hash" not in existing_cols:
            print("Migrating schema: Adding password_hash column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN password_hash VARCHAR(256)")

        if existing_cols and "password_salt" not in existing_cols:
            print("Migrating schema: Adding password_salt column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN password_salt VARCHAR(64)")

        cursor.execute("PRAGMA table_info(alerts)")
        existing_alert_cols = [row[1] for row in cursor.fetchall()]

        if existing_alert_cols and "status" not in existing_alert_cols:
            print("Migrating schema: Adding status column to alerts table...")
            cursor.execute("ALTER TABLE alerts ADD COLUMN status VARCHAR(20) DEFAULT 'NEW'")

        if existing_alert_cols and "feedback" not in existing_alert_cols:
            print("Migrating schema: Adding feedback column to alerts table...")
            cursor.execute("ALTER TABLE alerts ADD COLUMN feedback VARCHAR(20)")

        if existing_alert_cols and "feedback_at" not in existing_alert_cols:
            print("Migrating schema: Adding feedback_at column to alerts table...")
            cursor.execute("ALTER TABLE alerts ADD COLUMN feedback_at DATETIME")

        if existing_alert_cols and "feedback_notes" not in existing_alert_cols:
            print("Migrating schema: Adding feedback_notes column to alerts table...")
            cursor.execute("ALTER TABLE alerts ADD COLUMN feedback_notes TEXT")

        conn.commit()
    except Exception as e:
        print(f"Schema migration note: {e}")
    finally:
        conn.close()


def ensure_demo_account():
    """
    Ensures the official demo account (demo@fraudwarning.com / Demo@123)
    exists and has a valid password hash and salt.
    Also ensures existing seeded users have demo credentials initialized.
    """
    db = SessionLocal()
    try:
        demo_user = db.query(models.User).filter(models.User.email == "demo@fraudwarning.com").first()
        if not demo_user:
            print("Creating primary demo account: demo@fraudwarning.com ...")
            pwd_hash, pwd_salt = hash_password("Demo@123")
            demo_user = models.User(
                name="Demo User",
                email="demo@fraudwarning.com",
                phone="+91-9999988888",
                password_hash=pwd_hash,
                password_salt=pwd_salt,
                created_at=datetime.now(timezone.utc),
            )
            db.add(demo_user)
            db.commit()
            print("Demo account created successfully.")
        else:
            if not demo_user.password_hash or not demo_user.password_salt:
                pwd_hash, pwd_salt = hash_password("Demo@123")
                demo_user.password_hash = pwd_hash
                demo_user.password_salt = pwd_salt
                db.commit()
                print("Updated existing demo account credentials.")

        # Ensure demo user has at least 2 known beneficiaries and 1 known device for Phase 4 testing
        demo_bens = db.query(models.Beneficiary).filter(models.Beneficiary.user_id == demo_user.id).all()
        if len(demo_bens) < 2:
            now_utc = datetime.now(timezone.utc)
            ben1 = models.Beneficiary(
                user_id=demo_user.id,
                name="Sneha Verma (Sister)",
                account_identifier="ACC-DEMO-001",
                created_at=now_utc,
            )
            ben2 = models.Beneficiary(
                user_id=demo_user.id,
                name="Apex Utilities & Fiber",
                account_identifier="ACC-DEMO-002",
                created_at=now_utc,
            )
            db.add_all([ben1, ben2])
            db.commit()
            print("Seeded 2 known beneficiaries for demo account (ACC-DEMO-001, ACC-DEMO-002).")

        demo_devices = db.query(models.Device).filter(models.Device.user_id == demo_user.id).all()
        if len(demo_devices) < 1:
            now_utc = datetime.now(timezone.utc)
            dev1 = models.Device(
                user_id=demo_user.id,
                device_identifier="DEV-PIXEL8-DEMO-01",
                device_name="Google Pixel 8 Pro",
                first_seen=now_utc,
                last_seen=now_utc,
            )
            db.add(dev1)
            db.commit()
            print("Seeded 1 known device for demo account (DEV-PIXEL8-DEMO-01).")

        demo_sms = db.query(models.SMSMessage).filter(models.SMSMessage.user_id == demo_user.id).all()
        if len(demo_sms) < 2:
            sms_demo_suspicious = models.SMSMessage(
                user_id=demo_user.id,
                sender="+1800-CLAIM-NOW",
                message_text="URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.",
                received_at=datetime.fromisoformat("2026-10-07T10:00:00+00:00"),
                is_suspicious=True,
            )
            sms_demo_normal = models.SMSMessage(
                user_id=demo_user.id,
                sender="VK-HDFCBK",
                message_text="Your account debited for Rs 450. View statement at https://hdfcbank.com/statements.",
                received_at=datetime.fromisoformat("2026-10-06T15:30:00+00:00"),
                is_suspicious=False,
            )
            db.add_all([sms_demo_suspicious, sms_demo_normal])
            db.commit()
            print("Seeded demo SMS messages (1 suspicious at 2026-10-07 10:00 AM, 1 normal).")

        demo_txs = db.query(models.Transaction).filter(models.Transaction.user_id == demo_user.id).all()
        if len(demo_txs) < 2:
            now_utc = datetime.now(timezone.utc)
            tx1 = models.Transaction(
                user_id=demo_user.id,
                amount=450.0,
                transaction_type="UPI",
                beneficiary_id=demo_bens[0].id if demo_bens else None,
                device_id=demo_devices[0].id if demo_devices else None,
                location="Mumbai",
                timestamp=datetime.fromisoformat("2026-10-06T16:00:00+00:00"),
            )
            tx2 = models.Transaction(
                user_id=demo_user.id,
                amount=95000.0,
                transaction_type="BANK_TRANSFER",
                beneficiary_id=None,
                device_id=None,
                location="Jamnagar",
                timestamp=datetime.fromisoformat("2026-10-07T10:12:00+00:00"),
            )
            db.add_all([tx1, tx2])
            db.commit()
            print("Seeded 2 demo transactions for demo user (1 normal UPI, 1 anomalous transfer).")

        demo_assessments = db.query(models.RiskAssessmentRecord).filter(models.RiskAssessmentRecord.user_id == demo_user.id).all()
        if len(demo_assessments) < 3:
            a1 = models.RiskAssessmentRecord(
                user_id=demo_user.id,
                risk_score=0,
                risk_level="LOW",
                sms_text="Your electricity bill of Rs 850 was paid successfully.",
                transaction_amount=120.0,
                created_at=datetime.fromisoformat("2026-10-06T14:05:00+00:00"),
            )
            a2 = models.RiskAssessmentRecord(
                user_id=demo_user.id,
                risk_score=35,
                risk_level="MEDIUM",
                sms_text="Claim your prize bonus immediately at http://bit.ly/claim-bonus",
                transaction_amount=None,
                created_at=datetime.fromisoformat("2026-10-07T08:30:00+00:00"),
            )
            a3 = models.RiskAssessmentRecord(
                user_id=demo_user.id,
                risk_score=100,
                risk_level="HIGH",
                sms_text="URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately.",
                transaction_amount=450000.0,
                created_at=datetime.fromisoformat("2026-10-07T10:12:00+00:00"),
            )
            db.add_all([a1, a2, a3])
            db.commit()
            print("Seeded 3 demo risk assessments (LOW, MEDIUM, HIGH) for demo user.")

        # Also initialize password for other demo users if null
        other_users = db.query(models.User).filter(models.User.password_hash.is_(None)).all()
        for u in other_users:
            p_hash, p_salt = hash_password("Demo@123")
            u.password_hash = p_hash
            u.password_salt = p_salt
        if other_users:
            db.commit()
            print(f"Initialized demo credentials for {len(other_users)} existing users.")

    except Exception as e:
        db.rollback()
        print(f"Error ensuring demo account: {e}")
    finally:
        db.close()


def init_database():
    """
    Creates all SQLite database tables defined in models.
    Safe to run multiple times without deleting or modifying existing data.
    """
    print(f"Initializing database at: {DATABASE_FILE}")
    Base.metadata.create_all(bind=engine)
    migrate_database_schema()
    ensure_demo_account()
    print("Database tables initialized successfully:")
    for table_name in Base.metadata.tables.keys():
        print(f" - {table_name}")


if __name__ == "__main__":
    init_database()
