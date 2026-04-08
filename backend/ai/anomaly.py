import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import os

# --- PERSISTENCE LAYER ---
# Stores the trained weights locally within the module directory
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'anomaly_model.joblib')

def train_model(data):
    """
    Trains the Isolation Forest model on structured log feature vectors.
    
    Args:
        data (array-like): Numerical feature matrix (e.g., [risk_score, entropy, frequency])
        
    Returns:
        float: The contamination threshold used for the model.
    """
    print(f"[ANOMALY_CORE] Initializing training on {len(data)} vectors...")
    
    # contamination='auto' uses the offset_ defined in the original paper
    model = IsolationForest(
        n_estimators=100, 
        max_samples='auto', 
        contamination='auto', 
        random_state=42
    )
    
    # Fit the data to detect the 'normal' distribution
    model.fit(data)
    
    # Save for future inference calls
    joblib.dump(model, MODEL_PATH)
    print(f"[ANOMALY_CORE] Model synchronized and saved to {MODEL_PATH}")
    
    return model

def detect_anomaly(log_features):
    """
    Predicts if a specific log entry deviates from the established baseline.
    
    Args:
        log_features (list): A single set of numerical features for the log entry.
        
    Returns:
        bool: True if identified as an anomaly (-1), False if normal (1).
    """
    if not os.path.exists(MODEL_PATH):
        # Fallback if no model is found
        return False
    
    try:
        # Load the serialized model
        model = joblib.load(MODEL_PATH)
        
        # Reshape input to (1, n_features) for scikit-learn consistency
        features_array = np.array(log_features).reshape(1, -1)
        
        # Inference: returns 1 (normal) or -1 (anomaly)
        prediction = model.predict(features_array)
        
        return prediction[0] == -1
        
    except Exception as e:
        print(f"[ANOMALY_CORE] Prediction Failure: {str(e)}")
        return False

if __name__ == "__main__":
    # Self-test logic for validation
    print("[ANOMALY_CORE] Running module health check...")
    test_data = np.random.rand(100, 3) # Simulated baseline
    train_model(test_data)
    
    outlier = [10.0, 10.0, 10.0] # Obvious outlier
    is_anomaly = detect_anomaly(outlier)
    print(f"Test Result: Outlier Detection -> {'SUCCESS' if is_anomaly else 'FAILED'}")
