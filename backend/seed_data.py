import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Add backend directory to sys.path so script can be run standalone
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import engine, SessionLocal, Base
import models
from init_db import init_database


def seed_demo_data():
    """
    Populates SQLite database with realistic demo records for Phase 1.
    Safe to run multiple times: checks if users already exist before adding.
    """
    # Ensure tables exist
    init_database()

    db = SessionLocal()
    try:
        # Check if seed data is already present
        existing_users = db.query(models.User).count()
        if existing_users > 0:
            print(f"Database already contains {existing_users} users. Skipping duplicate seeding.")
            return

        print("Seeding demo data into database...")
        now = datetime.now(timezone.utc)

        from auth import hash_password
        pwd_hash, pwd_salt = hash_password("Demo@123")

        # ---------------------------------------------------------------------
        # 1. Users (Seed fictional users + Primary Demo User)
        # ---------------------------------------------------------------------
        user_demo = models.User(
            name="Demo User",
            email="demo@fraudwarning.com",
            phone="+91-9999988888",
            password_hash=pwd_hash,
            password_salt=pwd_salt,
            created_at=now - timedelta(days=90),
        )
        user_rahul = models.User(
            name="Rahul Sharma",
            email="rahul.sharma@example.com",
            phone="+91-9876543210",
            password_hash=pwd_hash,
            password_salt=pwd_salt,
            created_at=now - timedelta(days=60),
        )
        user_priya = models.User(
            name="Priya Patil",
            email="priya.patil@example.com",
            phone="+91-9823456789",
            password_hash=pwd_hash,
            password_salt=pwd_salt,
            created_at=now - timedelta(days=45),
        )
        user_amit = models.User(
            name="Amit Deshmukh",
            email="amit.deshmukh@example.com",
            phone="+91-9812345678",
            password_hash=pwd_hash,
            password_salt=pwd_salt,
            created_at=now - timedelta(days=30),
        )

        db.add_all([user_demo, user_rahul, user_priya, user_amit])
        db.flush()  # Flush to populate generated user IDs

        # ---------------------------------------------------------------------
        # 2. Devices
        # ---------------------------------------------------------------------
        dev_rahul_mobile = models.Device(
            user_id=user_rahul.id,
            device_identifier="DEV-SM-S23-01",
            device_name="Samsung Galaxy S23",
            first_seen=now - timedelta(days=60),
            last_seen=now - timedelta(hours=2),
        )
        dev_rahul_laptop = models.Device(
            user_id=user_rahul.id,
            device_identifier="DEV-MBP-M2-02",
            device_name="MacBook Pro M2",
            first_seen=now - timedelta(days=50),
            last_seen=now - timedelta(hours=5),
        )
        dev_rahul_unknown = models.Device(
            user_id=user_rahul.id,
            device_identifier="DEV-UNKNOWN-99",
            device_name="Unrecognized Chrome Browser on Linux",
            first_seen=now - timedelta(days=1),
            last_seen=now - timedelta(hours=1),
        )
        dev_priya_mobile = models.Device(
            user_id=user_priya.id,
            device_identifier="DEV-IPHONE15-01",
            device_name="Apple iPhone 15 Pro",
            first_seen=now - timedelta(days=45),
            last_seen=now - timedelta(hours=3),
        )
        dev_amit_mobile = models.Device(
            user_id=user_amit.id,
            device_identifier="DEV-ONEPLUS12-01",
            device_name="OnePlus 12",
            first_seen=now - timedelta(days=30),
            last_seen=now - timedelta(hours=1),
        )

        dev_demo_mobile = models.Device(
            user_id=user_demo.id,
            device_identifier="DEV-PIXEL8-DEMO-01",
            device_name="Google Pixel 8 Pro",
            first_seen=now - timedelta(days=90),
            last_seen=now - timedelta(minutes=15),
        )

        db.add_all([
            dev_demo_mobile,
            dev_rahul_mobile,
            dev_rahul_laptop,
            dev_rahul_unknown,
            dev_priya_mobile,
            dev_amit_mobile,
        ])
        db.flush()

        # ---------------------------------------------------------------------
        # 3. Beneficiaries
        # ---------------------------------------------------------------------
        ben_sunil = models.Beneficiary(
            user_id=user_rahul.id,
            name="Sunil Sharma (Brother)",
            account_identifier="sunil.sharma@oksbi",
            created_at=now - timedelta(days=40),
        )
        ben_torrent = models.Beneficiary(
            user_id=user_rahul.id,
            name="Torrent Power Utilities",
            account_identifier="AC-TORRENT-884920",
            created_at=now - timedelta(days=30),
        )
        ben_suspicious = models.Beneficiary(
            user_id=user_rahul.id,
            name="Quick Win Crypto Traders",
            account_identifier="crypto-quick-9981@paytm",
            created_at=now - timedelta(days=1),
        )
        ben_kavita = models.Beneficiary(
            user_id=user_priya.id,
            name="Kavita Patil (Sister)",
            account_identifier="kavita.p@hdfcbank",
            created_at=now - timedelta(days=25),
        )
        ben_tatasky = models.Beneficiary(
            user_id=user_amit.id,
            name="Tata Play DTH",
            account_identifier="DTH-982183921",
            created_at=now - timedelta(days=20),
        )

        ben_demo1 = models.Beneficiary(
            user_id=user_demo.id,
            name="Sneha Verma (Sister)",
            account_identifier="ACC-DEMO-001",
            created_at=now - timedelta(days=50),
        )
        ben_demo2 = models.Beneficiary(
            user_id=user_demo.id,
            name="Apex Utilities & Fiber",
            account_identifier="ACC-DEMO-002",
            created_at=now - timedelta(days=35),
        )

        db.add_all([ben_demo1, ben_demo2, ben_sunil, ben_torrent, ben_suspicious, ben_kavita, ben_tatasky])
        db.flush()

        # ---------------------------------------------------------------------
        # 4. Transactions
        # ---------------------------------------------------------------------
        tx1 = models.Transaction(
            user_id=user_rahul.id,
            amount=450.00,
            transaction_type="UPI",
            beneficiary_id=ben_sunil.id,
            device_id=dev_rahul_mobile.id,
            location="Mumbai, India",
            timestamp=now - timedelta(days=2, hours=3),
        )
        tx2 = models.Transaction(
            user_id=user_rahul.id,
            amount=2450.00,
            transaction_type="BANK_TRANSFER",
            beneficiary_id=ben_torrent.id,
            device_id=dev_rahul_laptop.id,
            location="Mumbai, India",
            timestamp=now - timedelta(days=1, hours=8),
        )
        tx3 = models.Transaction(
            user_id=user_rahul.id,
            amount=89000.00,
            transaction_type="BANK_TRANSFER",
            beneficiary_id=ben_suspicious.id,
            device_id=dev_rahul_unknown.id,
            location="St. Petersburg, Russia",
            timestamp=now - timedelta(hours=1),
        )
        tx4 = models.Transaction(
            user_id=user_priya.id,
            amount=1200.00,
            transaction_type="UPI",
            beneficiary_id=ben_kavita.id,
            device_id=dev_priya_mobile.id,
            location="Pune, India",
            timestamp=now - timedelta(days=3),
        )
        tx5 = models.Transaction(
            user_id=user_priya.id,
            amount=25000.00,
            transaction_type="CARD",
            beneficiary_id=None,
            device_id=dev_priya_mobile.id,
            location="Pune, India",
            timestamp=now - timedelta(days=1),
        )
        tx6 = models.Transaction(
            user_id=user_amit.id,
            amount=500.00,
            transaction_type="UPI",
            beneficiary_id=ben_tatasky.id,
            device_id=dev_amit_mobile.id,
            location="Nagpur, India",
            timestamp=now - timedelta(days=4),
        )
        tx7 = models.Transaction(
            user_id=user_amit.id,
            amount=10000.00,
            transaction_type="ATM",
            beneficiary_id=None,
            device_id=None,
            location="Nagpur, India",
            timestamp=now - timedelta(days=2),
        )

        db.add_all([tx1, tx2, tx3, tx4, tx5, tx6, tx7])

        # ---------------------------------------------------------------------
        # 5. SMS Messages (with explicit is_suspicious values for demo data)
        # ---------------------------------------------------------------------
        sms1 = models.SMSMessage(
            user_id=user_rahul.id,
            sender="VK-HDFCBK",
            message_text="Your A/C ending 4921 debited for INR 450.00 on 27-Sep-26 via UPI. Ref 9821938.",
            received_at=now - timedelta(days=2, hours=3),
            is_suspicious=False,
        )
        sms2 = models.SMSMessage(
            user_id=user_rahul.id,
            sender="+1800-CLAIM-NOW",
            message_text="URGENT: Your KYC is suspended! Click http://sbi-kyc-verify-portal.top/login immediately to prevent account freeze.",
            received_at=now - timedelta(hours=4),
            is_suspicious=True,
        )
        sms3 = models.SMSMessage(
            user_id=user_priya.id,
            sender="AD-SWIGGY",
            message_text="Your order from Kitchen Central has been delivered. Enjoy your meal!",
            received_at=now - timedelta(days=2),
            is_suspicious=False,
        )
        sms4 = models.SMSMessage(
            user_id=user_priya.id,
            sender="VK-LOTTRY",
            message_text="Congratulations! You have won INR 25,00,000 in national lottery. Call 9876500000 to claim your prize now.",
            received_at=now - timedelta(hours=8),
            is_suspicious=True,
        )
        sms5 = models.SMSMessage(
            user_id=user_amit.id,
            sender="AX-AXISBK",
            message_text="OTP for INR 500.00 transaction at Tata Sky is 839201. Valid for 5 mins. Do not share.",
            received_at=now - timedelta(days=4),
            is_suspicious=False,
        )
        sms6 = models.SMSMessage(
            user_id=user_amit.id,
            sender="BZ-TAXREF",
            message_text="Income Tax Department: Refund of Rs 42,850 pending. Update bank details at http://it-refund-portal.biz/claim.",
            received_at=now - timedelta(days=1),
            is_suspicious=True,
        )

        db.add_all([sms1, sms2, sms3, sms4, sms5, sms6])

        # ---------------------------------------------------------------------
        # 6. Alerts (Demo records only, no scoring algorithms)
        # ---------------------------------------------------------------------
        alert1 = models.Alert(
            user_id=user_rahul.id,
            alert_type="UNUSUAL_TRANSACTION",
            risk_level="HIGH",
            message="Large transfer of INR 89,000.00 initiated from unrecognized device DEV-UNKNOWN-99 in St. Petersburg, Russia.",
            created_at=now - timedelta(hours=1),
        )
        alert2 = models.Alert(
            user_id=user_rahul.id,
            alert_type="PHISHING_SMS",
            risk_level="MEDIUM",
            message="Suspicious SMS detected from +1800-CLAIM-NOW with unauthorized domain sbi-kyc-verify-portal.top.",
            created_at=now - timedelta(hours=4),
        )
        alert3 = models.Alert(
            user_id=user_priya.id,
            alert_type="LOTTERY_SCAM_SMS",
            risk_level="HIGH",
            message="Advance-fee fraud pattern identified in SMS from VK-LOTTRY requesting upfront contact.",
            created_at=now - timedelta(hours=8),
        )
        alert4 = models.Alert(
            user_id=user_amit.id,
            alert_type="TAX_REFUND_SCAM",
            risk_level="HIGH",
            message="Phishing link claiming government tax refund received in message from BZ-TAXREF.",
            created_at=now - timedelta(days=1),
        )

        db.add_all([alert1, alert2, alert3, alert4])

        # Commit everything to the database
        db.commit()
        print("Demo data seeded successfully:")
        print(f" - Users: {db.query(models.User).count()}")
        print(f" - Devices: {db.query(models.Device).count()}")
        print(f" - Beneficiaries: {db.query(models.Beneficiary).count()}")
        print(f" - Transactions: {db.query(models.Transaction).count()}")
        print(f" - SMS Messages: {db.query(models.SMSMessage).count()}")
        print(f" - Alerts: {db.query(models.Alert).count()}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding demo data: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
