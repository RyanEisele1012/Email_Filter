"""
Spam/Phishing Email Detection API

A Flask-based REST API that uses XGBoost and TF-IDF vectorization
to classify emails as spam/phishing or legitimate.

Usage:
    POST /predict
    {
        "subject": "Email subject line",
        "body": "Email body content"
    }
    
    Returns:
    {
        "prediction": 0 or 1,
        "label": "legitimate" or "spam/phishing",
        "confidence": 0.95,
        "threshold": 0.65
    }
"""

from flask import Flask, request, jsonify
import joblib
import os

app = Flask(__name__)

# Configuration
MODEL_PATH = os.environ.get('MODEL_PATH', '.')
SPAM_THRESHOLD = float(os.environ.get('SPAM_THRESHOLD', '0.65'))

# Load models at startup
print("Loading models...")
model = joblib.load(os.path.join(MODEL_PATH, 'spam_xgboost_model.joblib'))
vectorizer = joblib.load(os.path.join(MODEL_PATH, 'tfidf_vectorizer.joblib'))
print("Models loaded successfully!")


@app.route('/')
def home():
    """Health check endpoint"""
    return jsonify({
        "status": "Spam Detection API is running",
        "threshold": SPAM_THRESHOLD,
        "endpoints": {
            "GET /": "Health check",
            "POST /predict": "Classify email as spam/phishing or legitimate"
        }
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Classify an email as spam/phishing or legitimate.
    
    Expected JSON body:
    {
        "subject": "Email subject line",
        "body": "Email body content"
    }
    
    At least one of subject or body must be provided.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        subject = data.get('subject', '')
        body = data.get('body', '')
        
        if not subject and not body:
            return jsonify({'error': 'Provide at least subject or body'}), 400
        
        # Combine subject and body for classification
        combined_text = f"{subject} {body}"
        
        # Vectorize the text
        text_vectorized = vectorizer.transform([combined_text])
        
        # Get probability
        proba = model.predict_proba(text_vectorized)[0]
        spam_probability = float(proba[1])
        
        # Apply custom threshold
        prediction = 1 if spam_probability >= SPAM_THRESHOLD else 0
        
        result = {
            'prediction': prediction,
            'label': 'spam/phishing' if prediction == 1 else 'legitimate',
            'confidence': round(spam_probability, 4),
            'threshold': SPAM_THRESHOLD
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict', methods=['GET'])
def predict_usage():
    """Show usage instructions for the predict endpoint"""
    return jsonify({
        "endpoint": "POST /predict",
        "description": "Classify an email as spam/phishing or legitimate",
        "request_body": {
            "subject": "Email subject line (string, optional)",
            "body": "Email body content (string, optional)"
        },
        "note": "At least one of subject or body must be provided",
        "example": {
            "subject": "URGENT: You won $1,000,000!",
            "body": "Click here to claim your prize immediately."
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
