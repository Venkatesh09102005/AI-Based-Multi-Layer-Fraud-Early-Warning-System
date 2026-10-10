import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
import joblib

# Paths setup
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATASET_PATH = PROJECT_ROOT / "data" / "sms_dataset.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "sms_classifier.joblib"


def train_model():
    print("=" * 60)
    print("PHASE 2: SMS SCAM DETECTION - MODEL TRAINING")
    print("=" * 60)

    # 1. Load dataset
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

    print(f"[1] Loading dataset from: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)

    # 2. Validate dataset
    print("[2] Validating dataset...")
    required_cols = {"message", "label"}
    if not required_cols.issubset(df.columns):
        raise ValueError(f"Dataset must contain columns: {required_cols}. Found: {df.columns.tolist()}")

    print(f"    - Total rows: {len(df)}")
    print(f"    - Columns: {df.columns.tolist()}")

    # 3. Check for missing values
    missing = df.isnull().sum()
    print(f"[3] Missing values check:\n{missing}")
    if missing.any():
        print("    - Dropping missing rows...")
        df = df.dropna(subset=["message", "label"])

    # Distribution
    dist = df["label"].value_counts()
    print(f"    - Class distribution:\n{dist.to_string()}")

    X = df["message"]
    y = df["label"]

    # 4. Train / test split (80% train, 20% test, stratified)
    print("\n[4] Splitting dataset into 80% train / 20% test (stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )
    print(f"    - Training samples: {len(X_train)} ({X_train.shape[0]})")
    print(f"    - Testing samples:  {len(X_test)} ({X_test.shape[0]})")

    # 5. Pipeline creation (TF-IDF + Logistic Regression)
    print("\n[5] Building scikit-learn Pipeline (TfidfVectorizer + LogisticRegression)...")
    pipeline = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                lowercase=True,
                stop_words="english",
                ngram_range=(1, 2),
                sublinear_tf=True,
                min_df=1,
            ),
        ),
        (
            "classifier",
            LogisticRegression(
                random_state=42,
                max_iter=1000,
                C=1.0,
                solver="lbfgs",
            ),
        ),
    ])

    # 6. Train model
    print("[6] Training model on training dataset...")
    pipeline.fit(X_train, y_train)
    print("    - Training complete.")

    # 7. Evaluate on test set
    print("\n[7] Evaluating model on unseen test set...")
    y_pred = pipeline.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, pos_label="suspicious", zero_division=0)
    rec = recall_score(y_test, y_pred, pos_label="suspicious", zero_division=0)
    f1 = f1_score(y_test, y_pred, pos_label="suspicious", zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=["normal", "suspicious"])

    # 8. Print results clearly
    print("\n" + "=" * 60)
    print("EVALUATION RESULTS (TEST SET):")
    print("=" * 60)
    print(f"Accuracy:  {acc:.4f} ({acc * 100:.2f}%)")
    print(f"Precision: {prec:.4f} ({prec * 100:.2f}%) [pos_label='suspicious']")
    print(f"Recall:    {rec:.4f} ({rec * 100:.2f}%) [pos_label='suspicious']")
    print(f"F1-Score:  {f1:.4f} ({f1 * 100:.2f}%) [pos_label='suspicious']")
    print("\nConfusion Matrix (Rows=True, Cols=Predicted):")
    print("              Pred: Normal  Pred: Suspicious")
    print(f"True Normal:       {cm[0, 0]:<12} {cm[0, 1]:<12}")
    print(f"True Suspicious:   {cm[1, 0]:<12} {cm[1, 1]:<12}")
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, digits=4))

    # 9. Save trained pipeline
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[9] Saving full TF-IDF + Logistic Regression pipeline to:\n    {MODEL_PATH}")
    joblib.dump(pipeline, MODEL_PATH)
    print("    - Model saved successfully.")

    # 10. Smoke test on user-specified examples
    print("\n[10] Verification smoke test on specified examples:")
    test_samples = [
        "Congratulations! You have won a cash reward of Rs 50,000. Click this link to claim your prize.",
        "Your electricity bill payment of Rs 850 was successful. Thank you.",
        "Your bank account will be blocked today. Complete KYC immediately using this link.",
        "Your order has been shipped and will arrive tomorrow.",
    ]
    for sample in test_samples:
        pred = pipeline.predict([sample])[0]
        probs = pipeline.predict_proba([sample])[0]
        class_idx = list(pipeline.classes_).index(pred)
        conf = probs[class_idx]
        print(f" - Text: \"{sample[:60]}...\"")
        print(f"   -> Prediction: {pred.upper()} (Confidence: {conf:.2%})")

    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "confusion_matrix": cm.tolist(),
        "model_path": str(MODEL_PATH),
    }


if __name__ == "__main__":
    train_model()
