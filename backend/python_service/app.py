from flask import Flask, request, jsonify
import pickle
import os
import sys

app = Flask(__name__)

# Load Model
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
            print("AI Model loaded successfully.", file=sys.stderr)
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
    else:
        print("Model files not found. Please run train_model.py first.", file=sys.stderr)

load_ai_model()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    if not model or not vectorizer:
        return jsonify({'response': 'System: AI Model is initializing or missing. Please checking server logs.', 'intent': 'error'})

    # Predict Intent
    try:
        features = vectorizer.transform([user_message])
        intent = model.predict(features)[0]
        
        # Simple Rule-Based Responses based on Intent
        # In a real app, you might query a DB or use a more complex generation method
        response_map = {
            'greeting': "Hello! SentinelX System is online. How can I assist you?",
            'status': "System Status: All servers are currently operational.",
            'security': "Security Alert: No active threats detected at this time.",
            'logs': "Log Analysis: You can view the full detailed logs in the Dashboard tab.",
            'help': "I can help you check system status, security alerts, and logs.",
            'unknown': "I'm not sure I understand. Try asking about 'status' or 'security'."
        }
        
        response_text = response_map.get(intent, response_map['unknown'])
        
        return jsonify({
            'response': response_text,
            'intent': intent
        })

    except Exception as e:
        print(f"Prediction Error: {e}", file=sys.stderr)
        return jsonify({'error': 'Internal Processing Error'}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'online', 'model_loaded': model is not None})

if __name__ == '__main__':
    port = 5001
    print(f"Starting Python AI Service on port {port}...", file=sys.stderr)
    app.run(host='127.0.0.1', port=port, debug=True)
