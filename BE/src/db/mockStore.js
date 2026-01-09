const { nodes, MOHALI_BASELINES } = require('./seed');

// In-memory storage for mock mode
const mockData = {
  readings: [],
  anomalies: []
};

function getTimeSlot(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function generateReading(node, timestamp) {
  const hour = timestamp.getHours();
  const timeSlot = getTimeSlot(hour);
  const baseline = MOHALI_BASELINES[node.zone_type][timeSlot];
  
  const variance = () => (Math.random() - 0.5) * 0.3;
  
  const noise = Math.round(baseline.noise * (1 + variance()) * 10) / 10;
  const temperature = Math.round(baseline.temp * (1 + variance() * 0.5) * 10) / 10;
  const air_quality = Math.round(baseline.aqi * (1 + variance()));
  const crowd_density = Math.round(Math.max(0, baseline.crowd * (1 + variance())));
  
  const nScore = Math.min(((noise - 40) / 60) * 100, 100);
  const tScore = Math.min(((temperature - 15) / 25) * 100, 100);
  const aScore = Math.min((air_quality / 150) * 100, 100);
  const dScore = Math.min((crowd_density / 30) * 100, 100);
  
  const stress_index = Math.max(0, Math.round(
    (nScore * 0.4) + (tScore * 0.25) + (aScore * 0.2) + (dScore * 0.15)
  ));
  
  return { noise, temperature, air_quality, crowd_density, stress_index };
}

function initMockData() {
  const now = new Date();
  
  // Generate 24 hours of historical data
  for (let i = 0; i < 288; i++) {
    const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000));
    
    for (const node of nodes) {
      const data = generateReading(node, timestamp);
      mockData.readings.push({
        time: timestamp,
        node_id: node.id,
        ...data
      });
    }
  }
  
  console.log(`Mock mode: Generated ${mockData.readings.length} readings`);
}

function generateExplanation(data, node) {
  if (data.stress_index > 80) {
    if (data.noise > 85) return "Critical noise levels detected. Likely heavy construction or congestion.";
    if (data.temperature > 32) return "High thermal stress. Heat island effect detected in this sector.";
    return "Multi-sensor correlation indicates a localized urban stress anomaly.";
  } else if (data.stress_index > 55) {
    return "Elevated activity levels. Monitoring for potential ordinance threshold breach.";
  }
  return "Sensing parameters nominal. No immediate infrastructure intervention required.";
}

function getLiveData() {
  const now = new Date();
  return nodes.map(node => {
    const data = generateReading(node, now);
    return {
      nodeId: node.id,
      name: node.name,
      coordinates: [node.lng, node.lat],
      sensors: {
        noise: data.noise,
        temp: data.temperature,
        airQuality: data.air_quality,
        crowd: data.crowd_density
      },
      stressIndex: data.stress_index,
      isAnomaly: data.stress_index > 80,
      aiExplanation: generateExplanation(data, node),
      timestamp: now.getTime(),
      sector: node.sector,
      zoneType: node.zone_type
    };
  });
}

function getHistory(nodeId, hours = 24) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  let readings = mockData.readings.filter(r => new Date(r.time).getTime() > cutoff);
  
  if (nodeId) {
    readings = readings.filter(r => r.node_id === nodeId);
  }
  
  return readings.slice(0, 500).map(r => ({
    timestamp: new Date(r.time).getTime(),
    nodeId: r.node_id,
    noise: r.noise,
    temp: r.temperature,
    airQuality: r.air_quality,
    crowd: r.crowd_density,
    stressIndex: r.stress_index
  }));
}

function getAnomalies() {
  return mockData.anomalies.map(a => ({
    id: a.id,
    timestamp: new Date(a.time).getTime(),
    nodeId: a.node_id,
    nodeName: nodes.find(n => n.id === a.node_id)?.name || 'Unknown',
    sector: nodes.find(n => n.id === a.node_id)?.sector || '',
    anomalyScore: a.anomaly_score,
    signals: a.signals,
    explanation: a.explanation,
    stressIndex: a.stress_index
  }));
}

function addReading(data) {
  mockData.readings.unshift({
    time: new Date(),
    ...data
  });
  
  // Keep only last 2000 readings
  if (mockData.readings.length > 2000) {
    mockData.readings = mockData.readings.slice(0, 2000);
  }
}

module.exports = {
  initMockData,
  getLiveData,
  getHistory,
  getAnomalies,
  addReading,
  nodes
};
