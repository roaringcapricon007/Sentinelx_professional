from flask import Flask, request, jsonify
import pickle
import os
import sys
import sys
import numpy as np
import requests
from sklearn.ensemble import IsolationForest

# --- Train ML Anomaly Model (Isolation Forest) ---
# For real-time SOC logs, we train an initial in-memory Isolation Forest 
# using simulated baseline features (Length, Numeric Count, Error Keyword Count).
anomaly_model = IsolationForest(contamination=0.05, random_state=42)
# Baseline "normal" traffic features
dummy_normal_data = np.array([
    [50, 2, 0], [45, 1, 0], [55, 3, 0], [48, 2, 0], [60, 4, 0], 
    [40, 1, 0], [52, 2, 0], [47, 1, 0], [58, 3, 0], [65, 5, 0]
])
anomaly_model.fit(dummy_normal_data)

# Import our custom Deep Learning modules
try:
    from prime_brain import PrimeBrain
    DEEP_LEARNING_AVAILABLE = True
except ImportError:
    DEEP_LEARNING_AVAILABLE = False
    print("Dependencies not yet ready. Falling back to Lite NLP.")
DEEP_LEARNING_AVAILABLE = False # Force Lite mode for instant startup

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

    # CASE B: Lite Brain Fallback (Quantum Synthesis Mode)
    if model and vectorizer:
        try:
            features = vectorizer.transform([user_message])
            intent = model.predict(features)[0]
            
            response_map = {
                'greeting': "NEXUS ONLINE. Greetings, Administrator. Neural link established. I am monitoring global node stability.",
                'status': "SYSTEM SCAN: All quantum kernels are operating at peak efficiency. Regional latency is nominal (8ms). Local node cluster is STABLE.",
                'security': "THREAT MONITOR: Global shield active. Monitoring 142 mesh nodes for zero-day vectors. Predictive isolation protocols standby.",
                'logs': "DATA ARCHIVE: Log repositories are synchronized. Deep analysis suggests 99.9% integrity. No structural anomalies detected in recent telemetry.",
                'help': "I am PRIME_AI v7.0. I can assist with Mesh Topology, Quantum Security enforcement, Heuristic Log Analysis, and System Intelligence optimization.",
                'unknown': "QUERY RECEIVED. I am processing your input through the Nexus core... Information synthesis suggests you may be asking about system parameters. Please specify a core command."
            }
            
            # Dynamic synthesis for "unknown" to make it feel smarter
            response = response_map.get(intent, response_map['unknown'])
            if intent == 'unknown' and len(user_message) > 5:
                response = f"NEURAL ANALYSIS: Analyzing '{user_message[:20]}...'. My current kernels suggest this relates to {intent if intent != 'unknown' else 'unmapped parameters'}. Please elaborate."

            return jsonify({
                'response': response,
                'intent': intent,
                'engine': 'SentinelX-Quantum-Synthesis-v7.0'
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
    trends = {"severity_over_time": [], "node_frequency": {}}
    
    for i, line in enumerate(lines):
        if not line.strip(): continue
        
        l = line.lower()
        # Severity
        sev = "INFO"
        if "error" in l or "critical" in l or "fail" in l: sev = "ERROR"
        elif "warn" in l or "caution" in l: sev = "WARN"
        summary[sev] += 1
        
        # Track trends (simulated time progression by line index)
        trends["severity_over_time"].append({"idx": i, "sev": sev})
        
        if sev != "INFO":
            # Device Detection (Enhanced)
            device = "Unknown Interface"
            if "sshd" in l or "kernel" in l or "boot" in l: device = "Linux Kernel"
            elif "system32" in l or "windows" in l or "update" in l: device = "Windows Server"
            elif "docker" in l or "container" in l or "k8s" in l: device = "Container Cluster"
            elif "nginx" in l or "apache" in l or "http" in l: device = "Web Gateway"
            elif "db" in l or "sql" in l or "mongo" in l or "query" in l: device = "Database Core"
            elif "firewall" in l or "packet" in l or "denied" in l: device = "Security Firewall"
            elif "auth" in l or "login" in l or "session" in l: device = "Identity Provider"
            elif "network" in l or "connection" in l or "latency" in l: device = "Network Backbone"
            
            trends["node_frequency"][device] = trends["node_frequency"].get(device, 0) + 1

            # AI Suggestion Logic (Enhanced Neural Inference)
            suggestion = "AI Analysis: Routine pattern detected. Continue monitoring."
            
            # Security / Auth
            if "login failed" in l or "auth" in l: 
                suggestion = "QUANTUM ACTION: Initiate zero-trust lockdown. Reset credentials for UID:992. Analyze IP geo-velocity."
            elif "denied" in l or "blocked" in l:
                suggestion = "QUANTUM ACTION: Dynamic firewall update. Origin IP blacklisted across all 14 nodes. Geo-fencing updated."
            
            # Performance / Resources
            elif "disk" in l or "space" in l: 
                suggestion = "QUANTUM ACTION: Predictive storage expansion. Moving cold data to S3-Glacier. Running automated FS-trim."
            elif "memory" in l or "oom" in l or "heap" in l: 
                suggestion = "QUANTUM ACTION: Thermal balancing triggered. Moving memory-intensive pods to Node-04-Alpha. GC tuning applied."
            elif "cpu" in l or "load" in l:
                suggestion = "QUANTUM ACTION: Dynamic core reallocation. Throttling non-essential background tasks. Auto-scale cooling initialized."
                
            # Network / Connectivity
            elif "timeout" in l or "unreachable" in l: 
                suggestion = "QUANTUM ACTION: Re-routing traffic through EU-CENTRAL-1. BGP path optimization in progress. Validating fiber-cut metrics."
            elif "ssl" in l or "cert" in l:
                suggestion = "QUANTUM ACTION: Certificate rotation auto-provisioned via Vault. Zero-downtime handshake verified."
                
            # Database
            elif "query" in l or "sql" in l:
                suggestion = "QUANTUM ACTION: AI-driven index synthesis. Materialized view recommended for this query pattern. Sharding re-evaluation."
                
            # General Errors
            elif "exception" in l or "stack" in l:
                suggestion = "QUANTUM ACTION: Neural root-cause analysis: Pattern matches known vuln-3342. Patching module v2.4.1. Rollback suppressed."
            
            issues.append({
                "device": device,
                "severity": sev,
                "message": line.strip(),
                "suggestion": suggestion,
                "timestamp": datetime.now().isoformat()
            })
            
    # Brain Summarization if available
    llm_summary = "Standard heuristic analysis complete."
    if brain:
        try:
            llm_summary = brain.summarize_anomalies([i['message'] for i in issues[:3]])
        except: pass

    return jsonify({
        "summary": summary,
        "issues": issues,
        "trends": trends,
        "llm_report": llm_summary,
        "engine": "SentinelX-Quantum-v7.0"
    })

@app.route('/security/pulse', methods=['GET'])
def security_pulse():
    import random
    # Futuristic values
    pps = round(random.uniform(45.2, 58.7), 1)
    sessions = random.randint(4500, 6200)
    risk_score = random.randint(1, 100)
    threat_vectors = ["DDoS-Mitigation", "SQL-Injection-Probe", "Lateral-Movement-Blocked", "API-Scraping-Detected"]
    
    return jsonify({
        "status": "Quantum Guard Active",
        "pps": pps,
        "sessions": sessions,
        "risk_score": risk_score,
        "threat_level": "OPTIMIZED" if risk_score < 30 else "VIGILANT" if risk_score < 70 else "NEXUS-BREACH-ALERT",
        "active_vectors": random.sample(threat_vectors, 2)
    })

@app.route('/ai/train', methods=['POST'])
def ai_train():
    import time
    time.sleep(2) # Simulate processing
    return jsonify({
        "status": "success",
        "accuracy": 98.4,
        "loss": 0.02,
        "epoch": 150
    })

@app.route('/ai/sync', methods=['POST'])
def ai_sync():
    import time
    time.sleep(1) # Simulate sync
    return jsonify({
        "status": "synced",
        "weights_version": "v6.5.2-alpha",
        "nodes_updated": 142
    })

# =========================================================================
# 5. ML Anomaly Detection & Local LLM (Llama 3 via Ollama) Handover
# =========================================================================
@app.route('/api/analyze-log', methods=['POST'])
def analyze_single_log():
    data = request.json
    if not data:
        return jsonify({"error": "No log data"}), 400
        
    message = data.get('message', '')
    ip = data.get('ip', '0.0.0.0')
    severity = data.get('severity', 'INFO')
    
    # 1. Feature Extraction for ML Model
    msg_length = len(message)
    num_count = sum(c.isdigit() for c in message)
    err_keywords = sum(1 for w in ['fail', 'error', 'denied', 'timeout', 'crash', 'critical'] if w in message.lower())
    
    features = np.array([[msg_length, num_count, err_keywords]])
    
    # 2. Predict with Isolation Forest (-1 is Anomaly, 1 is Normal)
    prediction = anomaly_model.predict(features)[0]
    is_anomaly = bool(prediction == -1)
    
    # Simple risk scoring logic based on ML prediction and severity
    risk_score = 5
    if severity == 'WARN': risk_score += 15
    if severity in ['ERROR', 'CRITICAL']: risk_score += 40
    if is_anomaly: risk_score += 30
    if "login" in message.lower() and "fail" in message.lower(): risk_score += 20
        
    risk_score = min(risk_score, 100)
    
    # 3. Determine Threat Type based on patterns
    threat_type = "Standard Operational Noise"
    rec = ["Continue monitoring."]
    
    l_msg = message.lower()
    if "login" in l_msg and "fail" in l_msg:
        threat_type = "Brute Force Attack"
        rec = ["Block Origin IP globally", "Enforce 2FA for targeted accounts"]
    elif "timeout" in l_msg or "refused" in l_msg:
        threat_type = "Service Degradation"
        rec = ["Check database health", "Scale up connection pool"]
    elif "sql" in l_msg or "syntax" in l_msg:
        threat_type = "SQL Injection Probe"
        rec = ["Sanitize inputs via WAF", "Review query logs"]
    
    # 4. Request Explanation from Local Llama 3 via Ollama
    explanation = f"ML Engine flagged this {severity} log. No immediate human-readable explanation available."
    
    try:
        # Attempt to reach local Ollama API
        prompt = f"Explain this error log briefly and professionally as a SOC analyst:\nLOG: {message}\nIP: {ip}\nSeverity: {severity}"
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=1.5 # Short timeout, we don't want to block the UI if Ollama isn't running
        )
        if response.status_code == 200:
            llm_result = response.json()
            explanation = llm_result.get('response', explanation).strip()
    except Exception as e:
        # Fallback to predefined intelligent explanations if Llama is offline
        if threat_type == "Brute Force Attack":
            explanation = f"Multiple authentication failures detected originating from IP {ip}. The actor is systematically testing credentials against the authentication gateway."
        elif threat_type == "Service Degradation":
            explanation = "Internal systems failed to establish a network handshake within the required timeframe. The target service may be offline or saturated with requests."
        elif threat_type == "SQL Injection Probe":
            explanation = "Anomalous database syntax detected in the request payload. Assessed as automated scanning looking for SQL vulnerabilities."
        else:
            explanation = f"Routine {severity} telemetry recorded matching standard threshold boundaries."

    return jsonify({
        "is_anomaly": is_anomaly,
        "risk_score": risk_score,
        "threat_type": threat_type,
        "explanation": explanation,
        "recommendations": rec
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting Python AI Service on port {port}...", file=sys.stderr)
    app.run(host='0.0.0.0', port=port, debug=False)
