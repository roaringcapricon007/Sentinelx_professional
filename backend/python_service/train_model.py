from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import IsolationForest
import numpy as np
import pickle
import os
import pandas as pd
import glob

# --- 1. CONFIGURATION ---
print("--- PRIME_AI NEURAL CORE: LAYER 2 TRAINING (AUGMENTED PATTERNS) ---")
# Pointing to the forensic data vault (re-synchronized)
uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'training_vault')
folders = ['Linux', 'Windows', 'Apache', 'Android', 'HDFS', 'Zookeeper', 'HPC', 'Proxifier', 'HealthApp', 'Mac', 'OpenSSH', 'Spark', 'Thunderbird', 'BGL', 'Hadoop', 'OpenStack']

data = [
    ("hello", "greeting"), ("hi", "greeting"), ("hey", "greeting"),
    ("system status", "status"), ("server health", "status"),
    ("security alerts", "security"), ("any threats", "security"),
    ("show logs", "logs"), ("log analysis", "logs"),
    ("help", "help"), ("commands", "help")
]

anomaly_features = []

# FEATURE EXTRACTION HELPER
def extract_features(msg):
    msg = str(msg)
    return [
        len(msg),                           # Feature 1: Length
        sum(c.isdigit() for c in msg),      # Feature 2: Numeric Count
        sum(1 for c in msg if not c.isalnum() and not c.isspace()) # Feature 3: Special Chars
    ]

# --- 2. DATA AUGMENTATION ---
for folder in folders:
    # --- HANDLES FLAT STRUCTURE IN VAULT ---
    search_pattern = os.path.join(uploads_dir, f"{folder}_2k.log_structured.csv")
    csv_files = glob.glob(search_pattern)
    
    if csv_files:
        print(f"Deep Analysis: Indexing {folder} neural patterns...")
        try:
            # Shift to 2000 rows for high-fidelity training
            df = pd.read_csv(csv_files[0], nrows=2000) 
            content_col = 'Content' if 'Content' in df.columns else ('Message' if 'Message' in df.columns else None)
            
            if content_col:
                for msg in df[content_col].dropna():
                    msg_low = str(msg).lower()
                    
                    # A. Intent Classification Data
                    intent = "logs"
                    # Enhanced keyword mapping
                    if any(k in msg_low for k in ["fail", "error", "critical", "deny", "invalid", "panic", "unauthorized", "refused", "blocked"]):
                        intent = "security"
                    elif any(k in msg_low for k in ["info", "success", "open", "close", "normal", "started", "stopped", "ready"]):
                        intent = "status"
                    data.append((msg_low, intent))
                    
                    # B. Anomaly Detection Baseline
                    # Only map "Normal" (status/info) logs to the baseline for better outlier detection
                    if intent != "security": 
                        anomaly_features.append(extract_features(msg))
                        
        except Exception as e:
            print(f"Skipping {folder}: {e}")

# --- 3. TRAIN CHATBOT/INTENT MODEL ---
print(f"PRIME_AI: Training Intent Engine on {len(data)} deep patterns...")
vectorizer = TfidfVectorizer(stop_words='english', max_features=10000) # Increased features
texts = [d[0] for d in data]
X_intent = vectorizer.fit_transform(texts)
y_intent = [d[1] for d in data]

clf_intent = MultinomialNB(alpha=0.1) # Smoothed for better generalization
clf_intent.fit(X_intent, y_intent)

# --- 4. TRAIN ANOMALY DETECTION MODEL ---
print(f"PRIME_AI: Training Anomaly Engine on {len(anomaly_features)} baseline samples...")
# Lower contamination for professional environments
clf_anomaly = IsolationForest(contamination=0.005, random_state=42) 
if anomaly_features:
    clf_anomaly.fit(np.array(anomaly_features))
else:
    print("Warning: No anomaly features collected. Falling back to dummy.")
    clf_anomaly.fit(np.array([[50, 2, 0], [45, 1, 0], [60, 4, 0]]))

# --- 5. PERSISTENCE ---
artifacts = {
    'chatbot_model.pkl': clf_intent,
    'tfidf_vectorizer.pkl': vectorizer,
    'anomaly_model.pkl': clf_anomaly
}

for name, obj in artifacts.items():
    path = os.path.join(os.path.dirname(__file__), name)
    with open(path, 'wb') as f:
        pickle.dump(obj, f)

print(f"SUCCESS: SentinelX Neural Nexus Synchronized (v8.0 Deep Training).")
print(f"- Total Intent Patterns: {len(data)}")
print(f"- Anomaly Baseline Nodes: {len(anomaly_features)}")
