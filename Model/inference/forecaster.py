import numpy as np
import os
from datetime import datetime, timedelta

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MOHALI_CONFIG, get_baseline, get_time_slot

class Forecaster:
    def __init__(self):
        self.model = None
        self.smoothing_factor = 0.3
    
    def predict(self, node_id, horizon_minutes=60):
        now = datetime.now()
        forecasts = []
        
        nodes = [node_id] if node_id else list(MOHALI_CONFIG['nodes'].keys())
        
        for nid in nodes:
            node_forecasts = []
            prev_values = None
            
            for i in range(0, horizon_minutes + 1, 15):
                future_time = now + timedelta(minutes=i)
                baseline = get_baseline(nid, future_time.hour, future_time.month)
                
                if prev_values is None:
                    noise_pred = baseline['noise']
                    temp_pred = baseline['temp']
                    aqi_pred = baseline['aqi']
                    crowd_pred = baseline['crowd']
                else:
                    noise_pred = self.smoothing_factor * baseline['noise'] + (1 - self.smoothing_factor) * prev_values['noise']
                    temp_pred = self.smoothing_factor * baseline['temp'] + (1 - self.smoothing_factor) * prev_values['temp']
                    aqi_pred = self.smoothing_factor * baseline['aqi'] + (1 - self.smoothing_factor) * prev_values['aqi']
                    crowd_pred = self.smoothing_factor * baseline['crowd'] + (1 - self.smoothing_factor) * prev_values['crowd']
                
                variance_scale = max(0.02, 0.05 - (i * 0.0005))
                noise_pred *= (1 + np.random.uniform(-variance_scale, variance_scale))
                temp_pred *= (1 + np.random.uniform(-variance_scale * 0.5, variance_scale * 0.5))
                aqi_pred *= (1 + np.random.uniform(-variance_scale * 1.2, variance_scale * 1.2))
                crowd_pred *= (1 + np.random.uniform(-variance_scale, variance_scale))
                
                noise_pred = np.clip(noise_pred, 30, 95)
                temp_pred = np.clip(temp_pred, 10, 45)
                aqi_pred = np.clip(aqi_pred, 20, 200)
                crowd_pred = np.clip(crowd_pred, 0, 35)
                
                prev_values = {
                    'noise': noise_pred,
                    'temp': temp_pred,
                    'aqi': aqi_pred,
                    'crowd': crowd_pred
                }
                
                n_score = min(((noise_pred - 40) / 60) * 100, 100)
                t_score = min(((temp_pred - 15) / 25) * 100, 100)
                a_score = min((aqi_pred / 150) * 100, 100)
                d_score = min((crowd_pred / 30) * 100, 100)
                
                stress_pred = max(0, round(
                    (n_score * 0.4) + (t_score * 0.25) + (a_score * 0.2) + (d_score * 0.15)
                ))
                
                confidence = max(0.65, 0.92 - (i * 0.003))
                
                node_forecasts.append({
                    'timestamp': future_time.isoformat(),
                    'minutes_ahead': i,
                    'predicted_stress': stress_pred,
                    'predicted_noise': round(noise_pred, 1),
                    'predicted_temp': round(temp_pred, 1),
                    'predicted_aqi': round(aqi_pred),
                    'predicted_crowd': round(crowd_pred),
                    'confidence': round(confidence, 2)
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
        
        if diff > 8:
            return 'increasing'
        elif diff < -8:
            return 'decreasing'
        return 'stable'
    
    def train(self, data=None):
        return True
