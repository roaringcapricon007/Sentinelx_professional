import numpy as np
import os
import joblib
import re
from sklearn.ensemble import IsolationForest

# --- CONFIGURATION ---
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'anomaly_model.joblib')

class LogVectorizer:
    """
    Converts raw log strings into numerical feature vectors for ML processing.
    """
    @staticmethod
    def vectorize(log_text):
        if not log_text:
            return [0, 0, 0, 0, 0]
        
        text = str(log_text).lower()
        
        # Feature 1: Log Length (Normalized-ish)
        length = len(text)
        
        # Feature 2: Severity Keyword Count
        risk_keywords = ['error', 'critical', 'fail', 'failed', 'panic', 'fatal', 'denied', 'attack', 'exception']
        keyword_count = sum(1 for word in risk_keywords if word in text)
        
        # Feature 3: Special Character Density (indicators of injection or complex errors)
        special_chars = len(re.findall(r'[^a-zA-Z0-9\s]', text))
        
        # Feature 4: Presence of IP address (0 or 1)
        has_ip = 1 if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', text) else 0
        
        # Feature 5: Numeric Density (logs with many numbers are often stack traces or sensitive data)
        digit_count = sum(c.isdigit() for c in text)
        
        return [length, keyword_count, special_chars, has_ip, digit_count]

def train_model(data):
    """
    Trains the Isolation Forest model on numerical features.
    """
    print(f"[AI_CORE] Training Isolation Forest on {len(data)} samples...")
    model = IsolationForest(
        n_estimators=100,
        contamination=0.05, # Assumes 5% of logs are anomalies
        random_state=42
    )
    model.fit(data)
    joblib.dump(model, MODEL_PATH)
    print(f"[AI_CORE] Model synchronized: {MODEL_PATH}")
    return model

def detect_anomaly(log_text):
    """
    Converts log to features and predicts anomaly status.
    Returns: (is_anomaly, status_string)
    """
    features = LogVectorizer.vectorize(log_text)
    
    # Load model or train on dummy if missing for stability
    if not os.path.exists(MODEL_PATH):
        # Create a baseline if no model exists (Stability Constraint)
        baseline = np.random.rand(10, 5) * 10
        train_model(baseline)
    
    try:
        model = joblib.load(MODEL_PATH)
        prediction = model.predict([features])
        is_anomaly = prediction[0] == -1
        return is_anomaly, "ANOMALY" if is_anomaly else "NORMAL"
    except Exception as e:
        print(f"[AI_CORE] Inference Error: {e}")
        return False, "NORMAL"

if __name__ == "__main__":
    # Test Module
    msg = "ERROR: Unauthorized access attempt from 192.168.1.105 on port 22"
    is_anom, status = detect_anomaly(msg)
    print(f"Log: {msg}\nResult: {status} (Anomaly: {is_anom})")
