import os
from pathlib import Path
import joblib

# Determine model path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MODEL_PATH = PROJECT_ROOT / "ml" / "models" / "sms_classifier.joblib"


class SMSService:
    def __init__(self, model_path: Path = MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self.load_model()

    def load_model(self):
        """Loads the trained TF-IDF + Logistic Regression pipeline from disk once."""
        if self.model_path.exists():
            try:
                self.model = joblib.load(self.model_path)
                print(f"[SMSService] Loaded model successfully from {self.model_path}")
            except Exception as e:
                print(f"[SMSService] Error loading model from {self.model_path}: {e}")
                self.model = None
        else:
            print(f"[SMSService] Model file not found at {self.model_path}. Train the model using ml/train_sms_model.py.")
            self.model = None

    def predict(self, message: str) -> dict:
        """
        Classifies an input SMS message as 'normal' or 'suspicious'.
        Returns prediction, confidence score, and explanation message.
        """
        if not self.model:
            # Attempt to reload if model was trained while service was running
            self.load_model()
            if not self.model:
                raise RuntimeError(
                    "SMS classification model is not loaded. Please train the model using ml/train_sms_model.py first."
                )

        cleaned_text = message.strip()
        if not cleaned_text:
            raise ValueError("Input SMS message text cannot be empty.")

        # Predict class and probability
        prediction = self.model.predict([cleaned_text])[0]
        probabilities = self.model.predict_proba([cleaned_text])[0]
        classes = list(self.model.classes_)
        class_idx = classes.index(prediction)
        confidence = float(probabilities[class_idx])

        # Generate descriptive, non-definitive explanation message
        if prediction == "suspicious":
            explanation = "This SMS shows characteristics associated with suspicious messages."
        else:
            explanation = "This SMS appears similar to normal messages in the training data."

        return {
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "message": explanation
        }


# Global singleton instance for FastAPI application
sms_service = SMSService()
