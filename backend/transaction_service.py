import os
from pathlib import Path
import pandas as pd
import joblib

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MODEL_PATH = PROJECT_ROOT / "ml" / "models" / "transaction_anomaly_model.joblib"

FEATURE_COLUMNS = [
    "amount",
    "transaction_type",
    "hour",
    "day_of_week",
    "location",
    "beneficiary_id",
    "device_id",
]


class TransactionService:
    def __init__(self, model_path: Path = MODEL_PATH):
        self.model_path = model_path
        self.pipeline = None
        self.load_model()

    def load_model(self):
        """Loads the trained Isolation Forest pipeline from disk once."""
        if self.model_path.exists():
            try:
                self.pipeline = joblib.load(self.model_path)
                print(f"[TransactionService] Loaded anomaly model from {self.model_path}")
            except Exception as e:
                print(f"[TransactionService] Error loading model: {e}")
                self.pipeline = None
        else:
            print(f"[TransactionService] Model file not found at {self.model_path}. Run ml/train_transaction_model.py first.")
            self.pipeline = None

    def analyze(self, transaction_data: dict) -> dict:
        """
        Analyzes a transaction for anomalies using unsupervised Isolation Forest.
        Returns prediction ('normal' or 'anomalous'), decision anomaly score, and explanation message.
        """
        if not self.pipeline:
            self.load_model()
            if not self.pipeline:
                raise RuntimeError(
                    "Transaction anomaly model is not loaded. Please train the model using ml/train_transaction_model.py first."
                )

        # Prepare single-row DataFrame matching the exact training feature format
        row = {
            "amount": float(transaction_data["amount"]),
            "transaction_type": str(transaction_data["transaction_type"]).strip().upper(),
            "hour": int(transaction_data["hour"]),
            "day_of_week": int(transaction_data["day_of_week"]),
            "location": str(transaction_data.get("location", "Unknown")).strip() or "Unknown",
            "beneficiary_id": int(transaction_data.get("beneficiary_id") or 0),
            "device_id": int(transaction_data.get("device_id") or 0),
        }

        row_df = pd.DataFrame([row], columns=FEATURE_COLUMNS)

        # Predict using Isolation Forest: 1 = normal (inlier), -1 = anomalous (outlier)
        pred_val = self.pipeline.predict(row_df)[0]
        score = float(self.pipeline.decision_function(row_df)[0])

        if pred_val == -1:
            prediction = "anomalous"
            message = "This transaction differs from patterns observed in the training data."
        else:
            prediction = "normal"
            message = "This transaction is similar to patterns observed in the training data."

        return {
            "prediction": prediction,
            "anomaly_score": round(score, 4),
            "message": message,
        }


# Global singleton instance for FastAPI application
transaction_service = TransactionService()
