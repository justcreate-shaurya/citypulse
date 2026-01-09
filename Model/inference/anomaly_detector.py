import numpy as np
import joblib
import os
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MOHALI_CONFIG, get_baseline, get_time_slot

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
        self.model_path = os.path.join(self.models_dir, 'anomaly_model.pkl')
        self.scaler_path = os.path.join(self.models_dir, 'anomaly_scaler.pkl')
        self._load_or_init_model()
    
    def _load_or_init_model(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
        else:
            self.model = IsolationForest(
                n_estimators=200,
                contamination=0.02,
                random_state=42,
                n_jobs=-1
            )
            self.scaler = StandardScaler()
    
    def detect(self, reading):
        node_id = reading.get('node_id')
        noise = float(reading.get('noise', 0))
        temperature = float(reading.get('temperature', 0))
        air_quality = int(reading.get('air_quality', 0))
        crowd_density = int(reading.get('crowd_density', 0))
        stress_index = int(reading.get('stress_index', 0))
        
        now = datetime.now()
        baseline = get_baseline(node_id, now.hour, now.month)
        time_slot = get_time_slot(now.hour)
        
        thresholds = MOHALI_CONFIG['thresholds']
        signals = []
        deviations = {}
        
        # Calculate deviations from Mohali baseline
        noise_dev = noise - baseline['noise']
        temp_dev = temperature - baseline['temp']
        aqi_dev = air_quality - baseline['aqi']
        crowd_dev = crowd_density - baseline['crowd']
        
        # Use trained model if available
        ml_anomaly = False
        ml_score = 0.5
        
        if self.model is not None and self.scaler is not None:
            try:
                X = np.array([[noise, temperature, air_quality, crowd_density]])
                X_scaled = self.scaler.transform(X)
                prediction = self.model.predict(X_scaled)[0]
                score = -self.model.decision_function(X_scaled)[0]
                ml_anomaly = prediction == -1
                ml_score = min(max(score, 0), 1)
            except Exception:
                pass
        
        # Threshold-based signal detection
        if noise > thresholds['noise_critical'] or noise_dev > 15:
            signals.append('noise')
            deviations['noise'] = {'value': noise, 'baseline': baseline['noise'], 'deviation': round(noise_dev, 1)}
        
        if temperature > thresholds['temp_critical'] or temp_dev > 5:
            signals.append('heat')
            deviations['heat'] = {'value': temperature, 'baseline': baseline['temp'], 'deviation': round(temp_dev, 1)}
        
        if air_quality > thresholds['aqi_critical'] or aqi_dev > 30:
            signals.append('air_quality')
            deviations['air_quality'] = {'value': air_quality, 'baseline': baseline['aqi'], 'deviation': round(aqi_dev, 1)}
        
        if crowd_density > thresholds['crowd_critical'] or crowd_dev > 10:
            signals.append('crowd')
            deviations['crowd'] = {'value': crowd_density, 'baseline': baseline['crowd'], 'deviation': round(crowd_dev, 1)}
        
        # Combine ML and rule-based detection
        is_anomaly = ml_anomaly or stress_index > thresholds['stress_critical'] or len(signals) >= 2
        
        # Blend scores
        rule_score = min(stress_index / 100.0, 0.99)
        anomaly_score = (ml_score * 0.6 + rule_score * 0.4) if ml_anomaly else rule_score
        
        explanation = self._generate_explanation(signals, deviations, time_slot, node_id, stress_index)
        
        return {
            'is_anomaly': is_anomaly,
            'anomaly_score': round(anomaly_score, 3),
            'signals': signals,
            'explanation': explanation,
            'deviations': deviations,
            'baseline': baseline,
            'time_context': time_slot,
            'stress_index': stress_index
        }
    
    def _generate_explanation(self, signals, deviations, time_slot, node_id, stress_index):
        node_info = MOHALI_CONFIG['nodes'].get(node_id, {})
        location = node_info.get('name', 'this sector')
        
        if not signals and stress_index <= 55:
            return f"Sensing parameters nominal for {time_slot} at {location}. No intervention required."
        
        if not signals and stress_index > 55:
            return f"Elevated urban stress ({stress_index}) at {location} during {time_slot}. Monitoring for threshold breach."
        
        parts = []
        
        if 'noise' in signals:
            dev = deviations['noise']
            parts.append(f"Noise {dev['value']} dB (+{dev['deviation']} dB from {time_slot} baseline)")
        
        if 'heat' in signals:
            dev = deviations['heat']
            parts.append(f"Temperature {dev['value']}C (+{dev['deviation']}C thermal stress)")
        
        if 'air_quality' in signals:
            dev = deviations['air_quality']
            parts.append(f"AQI {dev['value']} (+{dev['deviation']} above safe levels)")
        
        if 'crowd' in signals:
            dev = deviations['crowd']
            parts.append(f"Crowd density {dev['value']} (+{dev['deviation']} above typical)")
        
        severity = "CRITICAL" if stress_index > 80 else "ELEVATED"
        return f"{severity} at {location}: " + "; ".join(parts)
    
    def train(self, data=None):
        if data is None:
            data = self._generate_training_data()
        
        X = np.array([[d['noise'], d['temp'], d['aqi'], d['crowd']] for d in data])
        self.model.fit(X)
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
        return True
    
    def _generate_training_data(self):
        data = []
        for zone_data in MOHALI_CONFIG['zones'].values():
            for slot_data in zone_data.values():
                for _ in range(100):
                    data.append({
                        'noise': slot_data['noise'] * (1 + np.random.normal(0, 0.15)),
                        'temp': slot_data['temp'] * (1 + np.random.normal(0, 0.1)),
                        'aqi': slot_data['aqi'] * (1 + np.random.normal(0, 0.2)),
                        'crowd': max(0, slot_data['crowd'] * (1 + np.random.normal(0, 0.25)))
                    })
        return data
