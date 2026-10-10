import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
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
DATASET_PATH = PROJECT_ROOT / "data" / "transaction_dataset.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "transaction_anomaly_model.joblib"


def train_transaction_model():
    print("=" * 65)
    print("PHASE 3: TRANSACTION ANOMALY DETECTION - MODEL TRAINING")
    print("=" * 65)

    # 1. Load dataset
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

    print(f"[1] Loading dataset from: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)

    # 2. Validate dataset
    print("[2] Validating dataset...")
    expected_cols = {
        "amount",
        "transaction_type",
        "hour",
        "day_of_week",
        "location",
        "beneficiary_id",
        "device_id",
    }
    if not expected_cols.issubset(df.columns):
        raise ValueError(f"Dataset missing required columns. Found: {df.columns.tolist()}")

    print(f"    - Total transaction records: {len(df)}")
    print(f"    - Columns present: {df.columns.tolist()}")

    # 3. Check for missing values
    missing = df.isnull().sum()
    print(f"[3] Checking missing values:\n{missing[missing > 0] if missing.any() else '    - Zero missing values.'}")
    if missing.any():
        df = df.dropna(subset=list(expected_cols))

    # Ground-truth evaluation target (kept strictly separate from features)
    y_ground_truth = None
    if "is_anomaly" in df.columns:
        y_ground_truth = df["is_anomaly"].values
        anomaly_count = int(np.sum(y_ground_truth == 1))
        normal_count = int(np.sum(y_ground_truth == 0))
        contamination_ratio = anomaly_count / len(df)
        print(f"[4] Ground-truth breakdown for evaluation:")
        print(f"    - Normal records: {normal_count} ({(1 - contamination_ratio) * 100:.1f}%)")
        print(f"    - Anomalous records: {anomaly_count} ({contamination_ratio * 100:.1f}%)")
    else:
        contamination_ratio = 0.06
        print("[4] No ground-truth label present; using default contamination=0.06")

    # 4. Feature selection
    feature_cols = [
        "amount",
        "transaction_type",
        "hour",
        "day_of_week",
        "location",
        "beneficiary_id",
        "device_id",
    ]
    X = df[feature_cols].copy()

    # Preprocessing definition
    numeric_features = ["amount", "hour", "day_of_week", "beneficiary_id", "device_id"]
    categorical_features = ["transaction_type", "location"]

    print(f"[5] Feature Engineering Pipeline:")
    print(f"    - Numeric features (StandardScaler): {numeric_features}")
    print(f"    - Categorical features (OneHotEncoder): {categorical_features}")

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
        ],
        remainder="drop",
    )

    # 5. Isolation Forest model configuration
    # Contamination set to match expected outlier ratio (~6%)
    contamination = round(contamination_ratio, 2)
    print(f"[6] Configuring Isolation Forest (unsupervised):")
    print(f"    - contamination: {contamination} (expected anomaly fraction)")
    print(f"    - n_estimators: 100")
    print(f"    - random_state: 42")

    isolation_forest = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        max_samples="auto",
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", isolation_forest),
    ])

    # 6. Fit unsupervised Isolation Forest
    print("[7] Training Isolation Forest model on transaction dataset...")
    pipeline.fit(X)
    print("    - Training complete.")

    # 7. Unsupervised predictions & evaluation
    # IsolationForest outputs: 1 = normal (inlier), -1 = anomalous (outlier)
    raw_preds = pipeline.predict(X)
    decision_scores = pipeline.decision_function(X)

    detected_anomalies = int(np.sum(raw_preds == -1))
    detected_normals = int(np.sum(raw_preds == 1))
    print(f"\n[8] Model Predictions on Dataset (Unsupervised):")
    print(f"    - Predicted Normal:    {detected_normals} ({detected_normals / len(X) * 100:.1f}%)")
    print(f"    - Predicted Anomalous: {detected_anomalies} ({detected_anomalies / len(X) * 100:.1f}%)")

    # Evaluation against ground truth if available
    eval_results = {}
    if y_ground_truth is not None:
        # Convert Isolation Forest output to binary (1 = anomaly, 0 = normal)
        y_pred_binary = np.where(raw_preds == -1, 1, 0)

        prec = precision_score(y_ground_truth, y_pred_binary, zero_division=0)
        rec = recall_score(y_ground_truth, y_pred_binary, zero_division=0)
        f1 = f1_score(y_ground_truth, y_pred_binary, zero_division=0)
        cm = confusion_matrix(y_ground_truth, y_pred_binary)

        print("\n" + "=" * 65)
        print("EVALUATION METRICS (Against Synthetic Ground Truth):")
        print("Note: Isolation Forest is unsupervised; ground truth is for evaluation only.")
        print("=" * 65)
        print(f"Precision: {prec:.4f} ({prec * 100:.2f}%) [Ratio of true anomalies among detected]")
        print(f"Recall:    {rec:.4f} ({rec * 100:.2f}%) [Detection rate of synthetic anomalies]")
        print(f"F1-Score:  {f1:.4f} ({f1 * 100:.2f}%)")
        print("\nConfusion Matrix (Rows=True, Cols=Predicted):")
        print("                  Pred: Normal (0)   Pred: Anomaly (1)")
        print(f"True Normal (0):        {cm[0, 0]:<16} {cm[0, 1]:<16}")
        print(f"True Anomaly (1):       {cm[1, 0]:<16} {cm[1, 1]:<16}")

        eval_results = {
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "confusion_matrix": cm.tolist(),
        }

    # 8. Save trained pipeline
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"\n[9] Saved complete preprocessing + Isolation Forest pipeline to:\n    {MODEL_PATH}")

    # 9. Smoke test sample transactions
    print("\n[10] Verification smoke test on sample transactions:")
    test_cases = [
        # Normal samples
        {"amount": 450.0, "transaction_type": "UPI", "hour": 14, "day_of_week": 2, "location": "Mumbai", "beneficiary_id": 1, "device_id": 1, "label": "Normal Grocery UPI"},
        {"amount": 2500.0, "transaction_type": "CARD", "hour": 19, "day_of_week": 5, "location": "Pune", "beneficiary_id": 0, "device_id": 2, "label": "Normal Dinner Card"},
        {"amount": 10000.0, "transaction_type": "BANK_TRANSFER", "hour": 11, "day_of_week": 1, "location": "Delhi", "beneficiary_id": 3, "device_id": 1, "label": "Normal Rent Transfer"},
        # Anomalous samples
        {"amount": 450000.0, "transaction_type": "UPI", "hour": 3, "day_of_week": 2, "location": "St. Petersburg", "beneficiary_id": 99, "device_id": 99, "label": "Unusual Midnight Foreign Transfer"},
        {"amount": 85000.0, "transaction_type": "ATM", "hour": 4, "day_of_week": 0, "location": "Unknown_Proxy", "beneficiary_id": 0, "device_id": 0, "label": "Unusual Late Night ATM"},
        {"amount": 320000.0, "transaction_type": "BANK_TRANSFER", "hour": 2, "day_of_week": 3, "location": "Lagos", "beneficiary_id": 99, "device_id": 99, "label": "High-Value Sudden Transfer"},
    ]

    for tc in test_cases:
        row_df = pd.DataFrame([{k: tc[k] for k in feature_cols}])
        pred = pipeline.predict(row_df)[0]
        score = float(pipeline.decision_function(row_df)[0])
        status_str = "ANOMALOUS" if pred == -1 else "NORMAL"
        print(f" - [{tc['label']}] Amount: Rs {tc['amount']}, Hour: {tc['hour']}, Loc: {tc['location']}")
        print(f"   -> Result: {status_str} (Anomaly Score: {score:+.4f})")

    return eval_results


if __name__ == "__main__":
    train_transaction_model()
