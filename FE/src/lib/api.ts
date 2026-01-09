const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface LiveNodeData {
  nodeId: string;
  name: string;
  coordinates: [number, number];
  sensors: {
    noise: number;
    temp: number;
    airQuality: number;
    crowd: number;
  };
  stressIndex: number;
  isAnomaly: boolean;
  timestamp: number;
  sector: string;
  zoneType: string;
}

export interface HistoricalData {
  timestamp: number;
  nodeId: string;
  noise: number;
  temp: number;
  airQuality: number;
  crowd: number;
  stressIndex: number;
}

export interface AnomalyData {
  id: number;
  timestamp: number;
  nodeId: string;
  nodeName: string;
  sector: string;
  anomalyScore: number;
  signals: string[];
  explanation: string;
  stressIndex: number;
}

export interface ForecastData {
  node_id: string;
  node_name: string;
  forecast: Array<{
    timestamp: string;
    minutes_ahead: number;
    predicted_stress: number;
    predicted_noise: number;
    predicted_temp: number;
    predicted_aqi: number;
    predicted_crowd: number;
    confidence: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
}

class ApiService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  async getLiveData(): Promise<LiveNodeData[]> {
    const response = await fetch(`${API_URL}/api/live`);
    if (!response.ok) throw new Error('Failed to fetch live data');
    return response.json();
  }

  async getHistory(nodeId?: string, hours = 24): Promise<HistoricalData[]> {
    const params = new URLSearchParams();
    if (nodeId) params.set('node_id', nodeId);
    params.set('hours', hours.toString());
    
    const response = await fetch(`${API_URL}/api/history?${params}`);
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  }

  async getAnomalies(hours = 24): Promise<AnomalyData[]> {
    const response = await fetch(`${API_URL}/api/anomalies?hours=${hours}`);
    if (!response.ok) throw new Error('Failed to fetch anomalies');
    return response.json();
  }

  async getForecast(nodeId?: string, horizon = 60): Promise<ForecastData | ForecastData[]> {
    const url = nodeId 
      ? `${API_URL}/api/forecast/${nodeId}?horizon=${horizon}`
      : `${API_URL}/api/forecast?horizon=${horizon}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch forecast');
    return response.json();
  }

  async ingestReading(data: {
    node_id: string;
    noise: number;
    temperature: number;
    air_quality: number;
    crowd_density: number;
  }): Promise<void> {
    const response = await fetch(`${API_URL}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to ingest data');
  }

  connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = API_URL.replace('http', 'ws') + '/ws';
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const listeners = this.listeners.get(message.type);
      if (listeners) {
        listeners.forEach(callback => callback(message.data));
      }
    };
    
    this.ws.onclose = () => {
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

export const apiService = new ApiService();
