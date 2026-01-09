const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

async function detectAnomaly(reading) {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reading)
    });
    
    if (!response.ok) {
      console.warn('ML service anomaly detection failed');
      return null;
    }
    
    return await response.json();
  } catch (err) {
    console.warn('ML service unavailable:', err.message);
    // Fallback: simple threshold-based detection
    return fallbackAnomalyDetection(reading);
  }
}

function fallbackAnomalyDetection(reading) {
  const signals = [];
  let explanation = '';
  
  if (reading.noise > 85) signals.push('noise');
  if (reading.temperature > 35) signals.push('heat');
  if (reading.air_quality > 120) signals.push('air_quality');
  if (reading.crowd_density > 25) signals.push('crowd');
  
  if (signals.length === 0 && reading.stress_index <= 80) {
    return { is_anomaly: false };
  }
  
  if (signals.includes('noise')) {
    explanation = `Noise level ${reading.noise} dB exceeds Mohali evening baseline`;
  } else if (signals.includes('heat')) {
    explanation = `Temperature ${reading.temperature}C indicates heat stress`;
  } else if (signals.includes('air_quality')) {
    explanation = `AQI ${reading.air_quality} above safe threshold`;
  } else if (reading.stress_index > 80) {
    explanation = 'Multi-sensor correlation indicates urban stress anomaly';
    signals.push('composite');
  }
  
  return {
    is_anomaly: reading.stress_index > 80 || signals.length > 0,
    anomaly_score: Math.min(reading.stress_index / 100, 0.99),
    signals,
    explanation
  };
}

async function getForecast(nodeId, horizon = 60) {
  try {
    const url = nodeId 
      ? `${ML_SERVICE_URL}/forecast/${nodeId}?horizon=${horizon}`
      : `${ML_SERVICE_URL}/forecast?horizon=${horizon}`;
      
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('ML service forecast failed');
      return { error: 'Forecast unavailable' };
    }
    
    return await response.json();
  } catch (err) {
    console.warn('ML service unavailable for forecast:', err.message);
    return { error: 'ML service unavailable' };
  }
}

module.exports = { detectAnomaly, getForecast };
