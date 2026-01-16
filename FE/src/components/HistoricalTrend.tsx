import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoricalDataPoint, NodeData } from '../lib/types';

interface HistoricalTrendProps {
  data: HistoricalDataPoint[];
  selectedNode: NodeData | null;
}

export function HistoricalTrend({ data, selectedNode }: HistoricalTrendProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#161B22] border border-white/20 rounded p-3 shadow-lg">
          <p className="text-xs font-mono text-gray-400 mb-2">{formatTime(data.timestamp)}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">Stress Index:</span>
              <span className="text-sm font-mono font-semibold text-[#00F5FF]">{data.stressIndex}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">Noise:</span>
              <span className="text-xs font-mono text-gray-400">{data.noise} dB</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">Temp:</span>
              <span className="text-xs font-mono text-gray-400">{data.temp}°C</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">AQI:</span>
              <span className="text-xs font-mono text-gray-400">{data.airQuality}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-300">Crowd:</span>
              <span className="text-xs font-mono text-gray-400">{data.crowd}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#00F5FF]" />
          <h2 className="font-semibold text-white">Historical Trend</h2>
          {selectedNode && (
            <span className="text-xs font-mono text-gray-400">({selectedNode.nodeId})</span>
          )}
        </div>
        <div className="text-xs text-gray-400">Last 10 minutes</div>
      </div>

      <div className="flex-1 p-4">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00F5FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                stroke="#9CA3AF"
                style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                domain={[0, 100]}
                style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                label={{ 
                  value: 'Stress Index', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#9CA3AF', fontSize: '12px' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="stressIndex" 
                stroke="#00F5FF" 
                strokeWidth={2}
                fill="url(#stressGradient)"
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400 text-sm">Collecting data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
