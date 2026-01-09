import numpy as np
import joblib
import os
from datetime import datetime
from sklearn.ensemble import IsolationForest

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MOHALI_CONFIG, get_baseline, get_time_slot

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'anomaly_model.pkl')
        self._load_or_init_model()
    
    def _load_or_init_model(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
        else:
            self.model = IsolationForest(
                n_estimators=100,
                contamination=0.1,
                random_state=42,
                n_jobs=-1
            )
    
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
        
        if noise > thresholds['noise_critical'] or noise_dev > 15:
            signals.append('noise')
            deviations['noise'] = {'value': noise, 'baseline': baseline['noise'], 'deviation': noise_dev}
        
        if temperature > thresholds['temp_critical'] or temp_dev > 5:
            signals.append('heat')
            deviations['heat'] = {'value': temperature, 'baseline': baseline['temp'], 'deviation': temp_dev}
        
        if air_quality > thresholds['aqi_critical'] or aqi_dev > 30:
            signals.append('air_quality')
            deviations['air_quality'] = {'value': air_quality, 'baseline': baseline['aqi'], 'deviation': aqi_dev}
        
        if crowd_density > thresholds['crowd_critical'] or crowd_dev > 10:
            signals.append('crowd')
            deviations['crowd'] = {'value': crowd_density, 'baseline': baseline['crowd'], 'deviation': crowd_dev}
        
        is_anomaly = stress_index > thresholds['stress_critical'] or len(signals) >= 2
        anomaly_score = min(stress_index / 100.0, 0.99)
        
        explanation = self._generate_explanation(signals, deviations, time_slot, node_id)
        
        return {
            'is_anomaly': is_anomaly,
            'anomaly_score': round(anomaly_score, 3),
            'signals': signals,
            'explanation': explanation,
            'deviations': deviations,
            'baseline': baseline,
            'time_context': time_slot
        }
    
    def _generate_explanation(self, signals, deviations, time_slot, node_id):
        node_info = MOHALI_CONFIG['nodes'].get(node_id, {})
        location = node_info.get('name', 'this sector')
        
        if not signals:
            return f"Sensing parameters nominal for {time_slot} at {location}. No intervention required."
        
        explanations = []
        
        if 'noise' in signals:
            dev = deviations['noise']
            explanations.append(f"Noise {dev['value']} dB is {dev['deviation']:.0f} dB above Mohali {time_slot} baseline")
        
        if 'heat' in signals:
            dev = deviations['heat']
            explanations.append(f"Temperature {dev['value']}C indicates thermal stress ({dev['deviation']:.1f}C above baseline)")
        
        if 'air_quality' in signals:
            dev = deviations['air_quality']
            explanations.append(f"AQI {dev['value']} exceeds safe levels (baseline: {dev['baseline']})")
        
        if 'crowd' in signals:
            dev = deviations['crowd']
            explanations.append(f"Crowd density {dev['value']} above typical {time_slot} levels")
        
        base = f"Alert at {location}: "
        return base + ". ".join(explanations)
    
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
