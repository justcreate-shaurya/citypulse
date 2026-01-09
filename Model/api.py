import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv

from inference.anomaly_detector import AnomalyDetector
from inference.forecaster import Forecaster

load_dotenv()

app = Flask(__name__)

anomaly_detector = AnomalyDetector()
forecaster = Forecaster()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'citypulse-ml'})

@app.route('/detect', methods=['POST'])
def detect_anomaly():
    data = request.json
    result = anomaly_detector.detect(data)
    return jsonify(result)

@app.route('/forecast', methods=['GET'])
def forecast_all():
    horizon = request.args.get('horizon', 60, type=int)
    result = forecaster.predict(None, horizon)
    return jsonify(result)

@app.route('/forecast/<node_id>', methods=['GET'])
def forecast_node(node_id):
    horizon = request.args.get('horizon', 60, type=int)
    result = forecaster.predict(node_id, horizon)
    return jsonify(result)

@app.route('/train', methods=['POST'])
def train_models():
    try:
        anomaly_detector.train()
        forecaster.train()
        return jsonify({'status': 'success', 'message': 'Models trained'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
