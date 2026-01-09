import numpy as np
import os
from datetime import datetime, timedelta

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MOHALI_CONFIG, get_baseline, get_time_slot

class Forecaster:
    def __init__(self):
        self.model = None
    
    def predict(self, node_id, horizon_minutes=60):
        now = datetime.now()
        forecasts = []
        
        nodes = [node_id] if node_id else list(MOHALI_CONFIG['nodes'].keys())
        
        for nid in nodes:
            node_forecasts = []
            
            for i in range(0, horizon_minutes, 15):
                future_time = now + timedelta(minutes=i)
                baseline = get_baseline(nid, future_time.hour, future_time.month)
                
                # Add trend prediction with slight variance
                noise_pred = baseline['noise'] * (1 + np.random.normal(0, 0.05))
                temp_pred = baseline['temp'] * (1 + np.random.normal(0, 0.03))
                aqi_pred = baseline['aqi'] * (1 + np.random.normal(0, 0.08))
                crowd_pred = max(0, baseline['crowd'] * (1 + np.random.normal(0, 0.1)))
                
                # Calculate predicted stress index
                n_score = min(((noise_pred - 40) / 60) * 100, 100)
                t_score = min(((temp_pred - 15) / 25) * 100, 100)
                a_score = min((aqi_pred / 150) * 100, 100)
                d_score = min((crowd_pred / 30) * 100, 100)
                
                stress_pred = max(0, round(
                    (n_score * 0.4) + (t_score * 0.25) + (a_score * 0.2) + (d_score * 0.15)
                ))
                
                node_forecasts.append({
                    'timestamp': future_time.isoformat(),
                    'minutes_ahead': i,
                    'predicted_stress': stress_pred,
                    'predicted_noise': round(noise_pred, 1),
                    'predicted_temp': round(temp_pred, 1),
                    'predicted_aqi': round(aqi_pred),
                    'predicted_crowd': round(crowd_pred),
                    'confidence': max(0.6, 0.95 - (i * 0.005))
                })
            
            forecasts.append({
                'node_id': nid,
                'node_name': MOHALI_CONFIG['nodes'].get(nid, {}).get('name', 'Unknown'),
                'forecast': node_forecasts,
                'trend': self._calculate_trend(node_forecasts)
            })
        
        return forecasts if len(forecasts) > 1 else forecasts[0]
    
    def _calculate_trend(self, forecasts):
        if len(forecasts) < 2:
            return 'stable'
        
        first = forecasts[0]['predicted_stress']
        last = forecasts[-1]['predicted_stress']
        diff = last - first
        
        if diff > 10:
            return 'increasing'
        elif diff < -10:
            return 'decreasing'
        return 'stable'
    
    def train(self, data=None):
        # Placeholder for ARIMA/LSTM training
        return True
