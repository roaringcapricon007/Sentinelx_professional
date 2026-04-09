import requests
import time
import random
import json

# --- SENTINELX EXTERNAL LOG AGENT (PRO) ---
# Simulates a remote node streaming telemetry to the Neural Matrix.

API_URL = "http://localhost:3000/api/log"

LOG_TEMPLATES = [
    {"message": "User login failure: invalid credentials for 'admin'", "source": "SOC-GATEWAY-PROD", "severity": "WARN"},
    {"message": "Database connection timeout: pool exhausted", "source": "DB-CLUSTER-MASTER", "severity": "ERROR"},
    {"message": "Neural handshake successful. Systems nominal.", "source": "NEURAL-MATRIX-01", "severity": "INFO"},
    {"message": "Suspected SQL injection attempt detected in GET /api/search", "source": "SOC-GATEWAY-PROD", "severity": "CRITICAL"},
    {"message": "CPU load threshold breached: 92%", "source": "DB-CLUSTER-MASTER", "severity": "WARN"},
    {"message": "Unauthorized access attempt on SSH port 22", "source": "SOC-GATEWAY-PROD", "severity": "ERROR"},
    {"message": "Kernel panic: catastrophic failure in memory module", "source": "NEURAL-MATRIX-01", "severity": "FATAL"}
]

def stream_telemetry():
    print("🚀 SentinelX Agent: Establishing uplink to Neural Matrix...")
    print(f"Target: {API_URL}")
    
    while True:
        try:
            # Select a random log template to simulate real network traffic
            log = random.choice(LOG_TEMPLATES)
            
            # Send the telemetry packet
            response = requests.post(API_URL, json=log, timeout=5)
            
            if response.status_code == 201:
                print(f"[SENTINELX] 📡 Telemetry Pushed: {log['severity']} | {log['message']}")
            else:
                print(f"[SENTINELX] ❌ Uplink Error: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"[SENTINELX] ⚠️ Critical Connection Failure: {str(e)}")
            
        # Interval set to 5 seconds as per requirements
        time.sleep(5)

if __name__ == "__main__":
    stream_telemetry()
