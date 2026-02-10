import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import pickle
import os

# 1. Prepare Training Data
# A small dataset to bootstrap the "Active Live Reply" capabilities
data = [
    ("hello", "greeting"),
    ("hi", "greeting"),
    ("hey", "greeting"),
    ("good morning", "greeting"),
    ("system status", "status"),
    ("how are the servers", "status"),
    ("is everything running", "status"),
    ("server health", "status"),
    ("check status", "status"),
    ("security alerts", "security"),
    ("any threats", "security"),
    ("firewall status", "security"),
    ("breach detected", "security"),
    ("show logs", "logs"),
    ("check history", "logs"),
    ("log analysis", "logs"),
    ("help", "help"),
    ("what can you do", "help"),
    ("commands", "help")
]

df = pd.DataFrame(data, columns=['text', 'intent'])

# 2. Vectorization (Convert text to numbers)
print("Vectorizing data...")
vectorizer = TfidfVectorizer(stop_words='english')
X = vectorizer.fit_transform(df['text'])
y = df['intent']

# 3. Train Model (Naive Bayes is fast and robust for small datasets)
print("Training model...")
clf = MultinomialNB()
clf.fit(X, y)

# 4. Save Artifacts
print("Saving model artifacts...")
model_path = os.path.join(os.path.dirname(__file__), 'chatbot_model.pkl')
vectorizer_path = os.path.join(os.path.dirname(__file__), 'tfidf_vectorizer.pkl')

with open(model_path, 'wb') as f:
    pickle.dump(clf, f)

with open(vectorizer_path, 'wb') as f:
    pickle.dump(vectorizer, f)

print("Success! Model trained and saved.")
print(f"Model: {model_path}")
print(f"Vectorizer: {vectorizer_path}")
