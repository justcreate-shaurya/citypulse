import { NodeData, ActivityLogEntry, HistoricalDataPoint } from './types';

export const sensorNodes = [
  { id: 'CP-MOH-01', coordinates: [76.6934, 30.7046] as [number, number], name: 'IT Park Sector 70' },
  { id: 'CP-MOH-02', coordinates: [76.7179, 30.7010] as [number, number], name: 'Phase 11' },
  { id: 'CP-MOH-03', coordinates: [76.7292, 30.7120] as [number, number], name: 'Phase 7' },
  { id: 'CP-MOH-04', coordinates: [76.7312, 30.6315] as [number, number], name: 'Plaksha University' },
  { id: 'CP-MOH-05', coordinates: [76.7245, 30.6885] as [number, number], name: 'Phase 3B2' },
];

// Weighted Stress Formula logic
export const calculateStressIndex = (sensors: any) => {
  const weights = { noise: 0.4, temp: 0.25, air: 0.2, crowd: 0.15 };

  // Normalizing to 0-100 scales for consistent math
  const nScore = Math.min(((sensors.noise - 40) / 60) * 100, 100); 
  const tScore = Math.min(((sensors.temp - 15) / 25) * 100, 100); 
  const aScore = Math.min((sensors.airQuality / 150) * 100, 100);
  const dScore = Math.min((sensors.crowd / 30) * 100, 100); 

  return Math.max(0, Math.round(
    (nScore * weights.noise) + (tScore * weights.temp) + 
    (aScore * weights.air) + (dScore * weights.crowd)
  ));
};

// Store persistent values for stable sensors (AQI and temp)
const stableSensorValues: Map<string, { airQuality: number; temp: number }> = new Map();

// Initialize stable values for a node
function getStableSensorValues(nodeId: string) {
  if (!stableSensorValues.has(nodeId)) {
    // Initialize with base values in the desired range
    // Mohali, India - January temperature typically 8-16°C (winter)
    stableSensorValues.set(nodeId, {
      airQuality: 220 + Math.random() * 30, // Base AQI between 220-250
      temp: 11 + Math.random() * 4, // Base temp between 11-15°C (Mohali winter)
    });
  }
  
  const current = stableSensorValues.get(nodeId)!;
  
  // Small random drift (very slow changes)
  const aqiDrift = (Math.random() - 0.5) * 4; // ±2 AQI change
  const tempDrift = (Math.random() - 0.5) * 0.4; // ±0.2°C change
  
  // Apply drift and clamp to desired ranges (Mohali January: 8-18°C range)
  current.airQuality = Math.max(200, Math.min(250, current.airQuality + aqiDrift));
  current.temp = Math.max(8, Math.min(18, current.temp + tempDrift));
  
  return current;
}

export function generateMockNodeData(nodeId: string, coordinates: [number, number]): NodeData {
  // Get stable values for AQI and temperature
  const stableValues = getStableSensorValues(nodeId);
  
  const sensors = {
    noise: Math.round((40 + Math.random() * 55) * 10) / 10,
    temp: Math.round(stableValues.temp * 10) / 10, // Stable temperature
    airQuality: Math.round(stableValues.airQuality), // Stable AQI in 200-250 range
    crowd: Math.round(Math.random() * 8), // Unit: Count/People
  };

  const stressIndex = calculateStressIndex(sensors);
  const isAnomaly = stressIndex > 80;

  // Dynamic AI Explanation Logic
  let aiExplanation = "Sensing parameters nominal. No immediate infrastructure intervention required.";
  if (stressIndex < 80) {
    if (sensors.airQuality > 85) aiExplanation = "Critical air quality levels detected. Likely heavy construction or pollution.";
    else if (sensors.temp > 32) aiExplanation = "High thermal stress. Heat island effect detected in this sector.";
    else aiExplanation = "Multi-sensor correlation indicates a localized urban stress anomaly.";
  } else if (stressIndex > 55) {
    aiExplanation = "Elevated activity levels. Monitoring for potential ordinance threshold breach.";
  }

  return {
    nodeId,
    coordinates,
    sensors,
    stressIndex,
    isAnomaly,
    aiExplanation,
    timestamp: Date.now(),
  };
}

export function generateActivityLog(nodeData: NodeData): ActivityLogEntry {
  let eventType: 'Normal' | 'Elevated' | 'Critical' = 'Normal';
  if (nodeData.stressIndex > 80) eventType = 'Critical';
  else if (nodeData.stressIndex > 55) eventType = 'Elevated';
  
  return {
    id: `${nodeData.nodeId}-${nodeData.timestamp}`,
    timestamp: nodeData.timestamp,
    nodeId: nodeData.nodeId,
    eventType,
    value: nodeData.stressIndex,
  };
}

export function generateHistoricalData(currentData: NodeData, existingHistory: HistoricalDataPoint[]): HistoricalDataPoint[] {
  const newPoint = {
    timestamp: currentData.timestamp,
    stressIndex: currentData.stressIndex,
    ...currentData.sensors
  };
  return [...existingHistory, newPoint].slice(-20);
}