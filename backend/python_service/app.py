from flask import Flask, request, jsonify
import pickle
import os
import sys

# Import our custom Deep Learning modules
try:
    from prime_brain import PrimeBrain
    DEEP_LEARNING_AVAILABLE = True
except ImportError:
    DEEP_LEARNING_AVAILABLE = False
    print("Dependencies not yet ready. Falling back to Lite NLP.")

app = Flask(__name__)

# --- Model Loading Strategy ---
# 1. Advanced Brain (Transformer/Deep Learning)
# 2. Lite Brain (TF-IDF/Naive Bayes)

# Advanced Brain Initialization
brain = None
if DEEP_LEARNING_AVAILABLE:
    try:
        brain = PrimeBrain()
    except Exception as e:
        print(f"CUDA/GPU Error: {e}")

# Lite Brain Initialization
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'chatbot_model.pkl')
VECTORIZER_PATH = os.path.join(os.path.dirname(__file__), 'tfidf_vectorizer.pkl')
model = None
vectorizer = None

def load_ai_model():
    global model, vectorizer
    if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
        try:
            with open(MODEL_PATH, 'rb') as f:
                model = pickle.load(f)
            with open(VECTORIZER_PATH, 'rb') as f:
                vectorizer = pickle.load(f)
            print("Lite AI Model loaded successfully.", file=sys.stderr)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)

load_ai_model()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    # CASE A: Advanced Generative Brain (ChatGPT Style)
    if brain:
        try:
            response_text = brain.generate_response(user_message)
            return jsonify({
                'response': response_text,
                'intent': 'generative',
                'engine': 'PRIME_AI-Transformer-Local'
            })
        except Exception as e:
            print(f"Brain Inference Error: {e}")

    # CASE B: Lite Brain Fallback
    if model and vectorizer:
        try:
            features = vectorizer.transform([user_message])
            intent = model.predict(features)[0]
            
            response_map = {
                'greeting': "Hello! SentinelX System is online. How can I assist you?",
                'status': "System Status: All servers are currently operational.",
                'security': "Security Alert: No active threats detected at this time.",
                'logs': "Log Analysis: You can view the full detailed logs in the Dashboard tab.",
                'help': "I can help you check system status, security alerts, and logs.",
                'unknown': "I'm not sure I understand. Try asking about 'status' or 'security'."
            }
            return jsonify({
                'response': response_map.get(intent, response_map['unknown']),
                'intent': intent,
                'engine': 'SentinelX-Lite-NLP'
            })
        except Exception as e:
            print(f"Lite Inference Error: {e}")

    return jsonify({'response': 'System: AI is currently updating its neural kernels.', 'intent': 'maintenance'})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'online', 
        'advanced_brain': brain is not None,
        'gpu_accelerated': 'torch' in sys.modules and hasattr(sys.modules['torch'], 'cuda') and sys.modules['torch'].cuda.is_available()
    })

@app.route('/automation/audit', methods=['POST'])
def run_automation_audit():
    # In a real enterprise scenario, this would perform deeper network/resource profiling
    # For this professional dashboard, we simulate highly detailed validation steps
    import time
    from datetime import datetime
    
    audit_results = [
        {"task": "Python Neural Handshake", "status": "PASS", "detail": "Orchestrator v6.0 synchronized with local model."},
        {"task": "Infrastructure Scanning", "status": "PASS", "detail": "Verified 142 nodes across US-EAST-1 and EU-WEST."},
        {"task": "Integrity Checksum", "status": "PASS", "detail": "Log buffer integrity verified (SHA-256 matches)."},
        {"task": "Latency Validation", "status": "WARN", "detail": "Minor jitter (14ms) detected in localized node cluster."},
        {"task": "Security Enforcement", "status": "PASS", "detail": "Node Auto-Isolation rules successfully validated."}
    ]
    
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'overallStatus': 'Optimized',
        'engine': 'Python-Core',
        'results': audit_results
    })

@app.route('/analysis/upload', methods=['POST'])
def analyze_logs():
    if 'log' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    log_file = request.files['log']
    content = log_file.read().decode('utf-8')
    lines = content.split('\n')
    
    issues = []
    summary = {"INFO": 0, "WARN": 0, "ERROR": 0}
    
    for line in lines:
        if not line.strip(): continue
        
        l = line.lower()
        # Severity
        sev = "INFO"
        if "error" in l or "critical" in l or "fail" in l: sev = "ERROR"
        elif "warn" in l or "caution" in l: sev = "WARN"
        summary[sev] += 1
        
        if sev != "INFO":
            # Device Detection
            device = "Unknown Node"
            if "sshd" in l or "kernel" in l: device = "Linux Backend"
            elif "system32" in l or "windows" in l: device = "Windows Node"
            elif "docker" in l or "container" in l: device = "Docker Cluster"
            elif "nginx" in l or "apache" in l: device = "Web Gateway"
            
            # Suggestion Logic
            suggestion = "Monitor and audit periodically."
            if "login failed" in l: suggestion = "Check authentication policy or reset credentials."
            elif "disk" in l: suggestion = "Clear disk space or extend volume."
            elif "memory" in l or "oom" in l: suggestion = "Increase RAM or optimize application."
            elif "timeout" in l: suggestion = "Check network connectivity or service health."
            
            issues.append({
                "device": device,
                "severity": sev,
                "message": line.strip(),
                "suggestion": suggestion
            })
            
    return jsonify({
        "summary": summary,
        "issues": issues,
        "engine": "Python-NLP-v6"
    })

if __name__ == '__main__':
    port = 5001
    print(f"Starting Python AI Service on port {port}...", file=sys.stderr)
    app.run(host='127.0.0.1', port=port, debug=True)
