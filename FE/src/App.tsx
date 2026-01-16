import { useState, useEffect, useRef } from 'react';
import { Waves, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeData, ActivityLogEntry, HistoricalDataPoint } from './lib/types';
import { 
  sensorNodes, 
  generateMockNodeData, 
  generateActivityLog 
} from './lib/mockData';

// Components
import { GlobalPulseMap } from './components/GlobalPulseMap';
import { ActivityFeed } from './components/ActivityFeed';
import { NodeIntelligence } from './components/NodeIntelligence';
import { HistoricalTrend } from './components/HistoricalTrend';

export default function App() {
  const [nodeDataMap, setNodeDataMap] = useState<Map<string, NodeData>>(new Map());
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [systemStatus] = useState<'online' | 'offline'>('online');
  const [anomalyAlert, setAnomalyAlert] = useState<NodeData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const previousAnomaliesRef = useRef<Set<string>>(new Set());
  const nodeDataMapRef = useRef<Map<string, NodeData>>(new Map());
  const selectedNodeRef = useRef<NodeData | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    nodeDataMapRef.current = nodeDataMap;
  }, [nodeDataMap]);
  
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // 1. Clock Sync
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Initial Data Load using Mock Data
  useEffect(() => {
    const loadInitialData = () => {
      const initialData = new Map<string, NodeData>();
      const initialLog: ActivityLogEntry[] = [];
      
      sensorNodes.forEach((sensor) => {
        const data = generateMockNodeData(sensor.id, sensor.coordinates);
        initialData.set(data.nodeId, data);
        initialLog.push(generateActivityLog(data));
      });
      
      setNodeDataMap(initialData);
      setActivityLog(initialLog.reverse());
      
      const firstNode = initialData.values().next().value;
      if (firstNode) {
        setSelectedNode(firstNode);
        // Generate initial historical data
        const initialHistory: HistoricalDataPoint[] = [];
        for (let i = 20; i > 0; i--) {
          const pastData = generateMockNodeData(firstNode.nodeId, firstNode.coordinates);
          initialHistory.push({
            timestamp: Date.now() - i * 60000,
            stressIndex: pastData.stressIndex,
            noise: pastData.sensors.noise,
            temp: pastData.sensors.temp,
            airQuality: pastData.sensors.airQuality,
            crowd: pastData.sensors.crowd,
          });
        }
        setHistoricalData(initialHistory);
      }
    };
    
    loadInitialData();
  }, []);

  // 3. Real-time Data Polling using Mock Data
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedMap = new Map<string, NodeData>();
      const newLogEntries: ActivityLogEntry[] = [];
      
      sensorNodes.forEach((sensor) => {
        const newData = generateMockNodeData(sensor.id, sensor.coordinates);
        updatedMap.set(newData.nodeId, newData);
        
        // Only log if data changed significantly
        const oldData = nodeDataMapRef.current.get(newData.nodeId);
        if (!oldData || Math.abs(oldData.stressIndex - newData.stressIndex) > 2) {
          newLogEntries.push(generateActivityLog(newData));
        }

        // Trigger Alert if Critical Anomaly (>80 Stress)
        if (newData.isAnomaly && !previousAnomaliesRef.current.has(newData.nodeId)) {
          triggerAnomalyEffects(newData);
        }
        
        if (!newData.isAnomaly) previousAnomaliesRef.current.delete(newData.nodeId);
        if (selectedNodeRef.current?.nodeId === newData.nodeId) {
          setSelectedNode(newData);
        }
      });

      setNodeDataMap(updatedMap);
      if (newLogEntries.length > 0) {
        setActivityLog(prev => [...newLogEntries.reverse(), ...prev].slice(0, 50));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array - uses refs instead

  // 4. Crisis Mode Demo Trigger (Press 'C')
  useEffect(() => {
    const handleCrisisTrigger = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && selectedNode) {
        const crisisData: NodeData = {
          ...selectedNode,
          stressIndex: 94,
          isAnomaly: true,
          sensors: { noise: 92.5, temp: 37.8, airQuality: 165, crowd: 28 },
          aiExplanation: "CRITICAL ALERT: Simultaneous spike in acoustic pollution and crowd density. Intervention required.",
          timestamp: Date.now()
        };
        
        setNodeDataMap(prev => new Map(prev).set(crisisData.nodeId, crisisData));
        setSelectedNode(crisisData);
        triggerAnomalyEffects(crisisData);
        setActivityLog(prev => [generateActivityLog(crisisData), ...prev].slice(0, 50));
      }
    };

    window.addEventListener('keydown', handleCrisisTrigger);
    return () => window.removeEventListener('keydown', handleCrisisTrigger);
  }, [selectedNode]);

  const triggerAnomalyEffects = (node: NodeData) => {
    setAnomalyAlert(node);
    previousAnomaliesRef.current.add(node.nodeId);
    
    // Audio Notification
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) { /* Browser blocked audio */ }

    setTimeout(() => setAnomalyAlert(null), 4000);
  };

  const handleNodeSelect = (nodeId: string) => {
    const node = nodeDataMap.get(nodeId);
    if (node) {
      setSelectedNode(node);
      // Generate mock historical data for selected node
      const sensorNode = sensorNodes.find(s => s.id === nodeId);
      if (sensorNode) {
        const mockHistory: HistoricalDataPoint[] = [];
        for (let i = 20; i > 0; i--) {
          const pastData = generateMockNodeData(nodeId, sensorNode.coordinates);
          mockHistory.push({
            timestamp: Date.now() - i * 60000,
            stressIndex: pastData.stressIndex,
            noise: pastData.sensors.noise,
            temp: pastData.sensors.temp,
            airQuality: pastData.sensors.airQuality,
            crowd: pastData.sensors.crowd,
          });
        }
        setHistoricalData(mockHistory);
      }
    }
  };

  const isGlobalCritical = Array.from(nodeDataMap.values()).some(n => (n as NodeData).stressIndex > 80);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0E14] flex flex-col text-white font-sans">
      
      {/* Top Notification Overlay */}
      <AnimatePresence>
        {anomalyAlert && (
          <motion.div
            initial={{ y: -100, x: '-50%' }}
            animate={{ y: 20, x: '-50%' }}
            exit={{ y: -100, x: '-50%' }}
            className="absolute left-1/2 z-[1000] bg-[#FF3B3B] px-6 py-3 rounded-full shadow-[0_0_30px_rgba(255,59,59,0.5)] border border-white/20 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 animate-pulse" />
            <span className="font-mono font-bold tracking-tight">
              ANOMALY DETECTED: {anomalyAlert.nodeId} (USI: {anomalyAlert.stressIndex})
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header HUD */}
      <header className="h-16 border-b border-white/10 bg-[#161B22]/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Waves className="w-8 h-8 text-[#00F5FF]" />
            {isGlobalCritical && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF3B3B] rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tighter uppercase">CityPulse <span className="text-[#00F5FF]">Control Center</span></h1>
            <div className="flex gap-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              <span>Sensing_Grid_v3.1</span>
              <span className="text-green-500">● Encrypted_Link</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className={`text-xs font-mono font-bold ${systemStatus === 'online' ? 'text-green-400' : 'text-red-400'}`}>
              {systemStatus === 'online' ? '● GRID_ONLINE' : '○ GRID_OFFLINE'}
            </div>
            <div className="text-[10px] font-mono text-gray-500">
              {currentTime.toLocaleTimeString('en-GB')} UTC
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Activity Feed */}
        <section className="w-72 border-r border-white/10 bg-[#0B0E14]">
          <ActivityFeed activities={activityLog} />
        </section>

        {/* Center: The Map */}
        <section className="flex-1 relative bg-[#0B0E14]">
          <GlobalPulseMap 
            nodes={Array.from(nodeDataMap.values())} 
            selectedNodeId={selectedNode?.nodeId}
            onNodeClick={handleNodeSelect}
          />
        </section>

        {/* Right: Intelligence Panel */}
        <section className="w-96 border-l border-white/10 bg-[#161B22]">
          <NodeIntelligence selectedNode={selectedNode} />
        </section>
      </main>

      {/* Bottom: Trend Analysis */}
      <footer className="h-48 border-t border-white/10 bg-[#161B22]/50">
        <HistoricalTrend data={historicalData} selectedNode={selectedNode} />
      </footer>
    </div>
  );
}