import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { NodeData } from '../lib/types';

interface GlobalPulseMapProps {
  nodes: NodeData[];
  selectedNodeId?: string;
  onNodeClick: (nodeId: string) => void;
}

export function GlobalPulseMap({ nodes, selectedNodeId, onNodeClick }: GlobalPulseMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [key: string]: maplibregl.Marker }>({});
  const [mapError, setMapError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Initialize Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Get MapTiler token from environment variable
    const MAPTILER_TOKEN = import.meta.env?.VITE_MAPTILER_TOKEN || '';
    
    // Check if token looks valid (not a placeholder)
    const isValidToken = MAPTILER_TOKEN && 
      MAPTILER_TOKEN.length > 10 && 
      !MAPTILER_TOKEN.includes('your_') &&
      !MAPTILER_TOKEN.includes('_here');

    if (!isValidToken) {
      console.warn('Using fallback visualization. MapTiler token not found or invalid.');
      setMapError(true);
      return;
    }

    try {
      console.log('Initializing MapTiler with token:', MAPTILER_TOKEN.substring(0, 5) + '...');
      
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_TOKEN}`,
        center: [76.7179, 30.7046], // Centered on Mohali
        zoom: 12,
        pitch: 45 // 3D Perspective
      });

      map.current.on('load', () => {
        console.log('MapTiler map loaded successfully');
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('MapTiler error:', e);
        setMapError(true);
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    } catch (error) {
      console.error('Failed to initialize MapTiler:', error);
      setMapError(true);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // 2. Sync Markers with Node Data
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    nodes.forEach((node) => {
      const isSelected = selectedNodeId === node.nodeId;
      const stressColor = node.stressIndex > 80 ? '#FF3B3B' : node.stressIndex > 55 ? '#FFB800' : '#00F5FF';
      const pulseClass = node.stressIndex > 80 ? 'animate-ping-fast' : 'animate-ping-slow';

      // Create or Update Marker Element
      if (!markers.current[node.nodeId]) {
        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative';
        
        // Inner Core
        const core = document.createElement('div');
        core.className = 'w-3 h-3 rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 relative transition-all duration-500';
        
        // Pulse Ring
        const ring = document.createElement('div');
        ring.className = `absolute inset-0 rounded-full opacity-75 ${pulseClass}`;
        
        // Label
        const label = document.createElement('div');
        label.className = 'absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 border border-white/20 rounded text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20';
        label.innerText = `${node.nodeId} | USI: ${node.stressIndex}`;

        el.appendChild(core);
        el.appendChild(ring);
        el.appendChild(label);

        el.addEventListener('click', () => onNodeClick(node.nodeId));

        markers.current[node.nodeId] = new maplibregl.Marker({ element: el })
          .setLngLat(node.coordinates as [number, number])
          .addTo(map.current!);
      }

      // Update Visuals based on Stress Level
      const markerEl = markers.current[node.nodeId].getElement();
      const core = markerEl.querySelector('div') as HTMLDivElement;
      const ring = markerEl.querySelector('.rounded-full:not(.z-10)') as HTMLDivElement;
      const label = markerEl.querySelector('.text-white') as HTMLDivElement;

      core.style.backgroundColor = stressColor;
      core.style.transform = isSelected ? 'scale(1.5)' : 'scale(1)';
      core.style.boxShadow = isSelected ? `0 0 20px ${stressColor}` : `0 0 10px ${stressColor}66`;
      
      ring.style.backgroundColor = stressColor;
      label.innerText = `${node.nodeId} | USI: ${node.stressIndex}`;
      
      if (isSelected) {
        markerEl.style.zIndex = '100';
      } else {
        markerEl.style.zIndex = '1';
      }
    });
  }, [nodes, selectedNodeId, mapLoaded]);

  // Fallback visualization when Mapbox is not available
  if (mapError) {
    const getNodeColor = (node: NodeData) => {
      if (node.stressIndex > 80) return '#FF3B3B';
      if (node.stressIndex > 55) return '#FFB800';
      return '#00F5FF';
    };

    // Mohali bounds for coordinate mapping
    const minLng = 76.68, maxLng = 76.78;
    const minLat = 30.68, maxLat = 30.75;
    
    const mapCoordToSvg = (lng: number, lat: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * 700 + 50;
      const y = ((maxLat - lat) / (maxLat - minLat)) * 500 + 50;
      return { x, y };
    };

    return (
      <div className="w-full h-full relative bg-[#0B0E14] overflow-hidden">
        {/* SVG Map Visualization */}
        <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,245,255,0.08)" strokeWidth="0.5"/>
            </pattern>
            <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,245,255,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background */}
          <rect width="800" height="600" fill="#0B0E14" />
          <rect width="800" height="600" fill="url(#grid)" />
          
          {/* City glow effect */}
          <ellipse cx="400" cy="300" rx="350" ry="250" fill="url(#cityGlow)" />
          
          {/* Mohali outline - simplified sectors */}
          <g stroke="rgba(0,245,255,0.2)" strokeWidth="1" fill="none">
            {/* Main road network representation */}
            <path d="M 100 300 L 700 300" strokeDasharray="5,5" />
            <path d="M 400 100 L 400 500" strokeDasharray="5,5" />
            <path d="M 200 150 L 600 450" strokeDasharray="3,3" opacity="0.5" />
            <path d="M 600 150 L 200 450" strokeDasharray="3,3" opacity="0.5" />
            
            {/* Sector boundaries */}
            <rect x="150" y="150" width="200" height="150" rx="5" opacity="0.3" />
            <rect x="450" y="150" width="200" height="150" rx="5" opacity="0.3" />
            <rect x="150" y="350" width="200" height="150" rx="5" opacity="0.3" />
            <rect x="450" y="350" width="200" height="150" rx="5" opacity="0.3" />
          </g>
          
          {/* City label */}
          <text x="400" y="45" textAnchor="middle" fill="rgba(0,245,255,0.6)" fontSize="18" fontFamily="monospace" fontWeight="bold" letterSpacing="8">
            MOHALI
          </text>
          <text x="400" y="65" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="monospace" letterSpacing="2">
            URBAN SENSING GRID
          </text>
          
          {/* Sector labels */}
          <text x="250" y="230" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="monospace">SECTOR 70</text>
          <text x="550" y="230" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="monospace">IT CITY</text>
          <text x="250" y="430" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="monospace">PHASE 8</text>
          <text x="550" y="430" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="monospace">AEROCITY</text>

          {/* Render sensor nodes */}
          {nodes.map((node, index) => {
            const pos = mapCoordToSvg(node.coordinates[0], node.coordinates[1]);
            // Fallback positions if coordinates are out of range
            const x = isNaN(pos.x) || pos.x < 50 || pos.x > 750 ? 200 + (index * 120) : pos.x;
            const y = isNaN(pos.y) || pos.y < 50 || pos.y > 550 ? 200 + (index % 2) * 150 : pos.y;
            const color = getNodeColor(node);
            const isSelected = selectedNodeId === node.nodeId;
            
            return (
              <g key={node.nodeId} onClick={() => onNodeClick(node.nodeId)} style={{ cursor: 'pointer' }}>
                {/* Outer pulse ring */}
                <circle cx={x} cy={y} r="30" fill={color} opacity="0.1">
                  <animate attributeName="r" values="20;40;20" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite" />
                </circle>
                
                {/* Inner pulse ring */}
                <circle cx={x} cy={y} r="18" fill={color} opacity="0.15">
                  <animate attributeName="r" values="12;25;12" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
                
                {/* Node core */}
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isSelected ? 14 : 10}
                  fill={color}
                  stroke="rgba(255,255,255,0.9)" 
                  strokeWidth={isSelected ? 3 : 2}
                  filter="url(#glow)"
                  style={{ transition: 'all 0.3s ease' }}
                >
                  {node.isAnomaly && (
                    <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite" />
                  )}
                </circle>
                
                {/* Selection ring */}
                {isSelected && (
                  <circle 
                    cx={x} 
                    cy={y} 
                    r="22"
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.8"
                  >
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="10s" repeatCount="indefinite" />
                  </circle>
                )}
                
                {/* Node ID label */}
                <text 
                  x={x} 
                  y={y - 28} 
                  textAnchor="middle" 
                  fill="rgba(255,255,255,0.9)" 
                  fontSize="9" 
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.nodeId}
                </text>
                
                {/* Stress value */}
                <text 
                  x={x} 
                  y={y + 35} 
                  textAnchor="middle" 
                  fill={color} 
                  fontSize="12" 
                  fontFamily="monospace"
                  fontWeight="bold"
                  filter="url(#glow)"
                >
                  USI: {node.stressIndex}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend - positioned in top-left */}
        <div className="absolute top-4 left-4 bg-[#161B22]/90 backdrop-blur-sm border border-white/10 rounded-lg p-3">
          <h4 className="text-[10px] font-mono text-gray-400 mb-2 uppercase tracking-widest">Map Legend</h4>
          <div className="space-y-1.5">
            <LegendItem color="#00F5FF" label="Nominal" range="0-54" />
            <LegendItem color="#FFB800" label="Elevated" range="55-79" />
            <LegendItem color="#FF3B3B" label="Critical" range="80-100" />
          </div>
        </div>
        
        {/* Info badge */}
        <div className="absolute bottom-4 left-4 bg-[#161B22]/80 border border-[#FFB800]/30 rounded px-3 py-2">
          <p className="text-[10px] text-[#FFB800] font-mono">
            ⚠ Simplified view • Set VITE_MAPTILER_TOKEN for full map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div 
        ref={mapContainer} 
        className="maplibregl-map" 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
      />
      
      {/* Loading indicator */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E14]" style={{ zIndex: 10 }}>
          <div className="text-[#00F5FF] font-mono text-sm animate-pulse">Loading Map...</div>
        </div>
      )}
      
      {/* Map Overlay HUD */}
      <div className="absolute top-4 left-4 pointer-events-none space-y-2 z-10">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-lg">
          <h4 className="text-[10px] font-mono text-gray-400 mb-2 uppercase tracking-widest">Map Legend</h4>
          <div className="space-y-1.5">
            <LegendItem color="#00F5FF" label="Nominal" range="0-54" />
            <LegendItem color="#FFB800" label="Elevated" range="55-79" />
            <LegendItem color="#FF3B3B" label="Critical" range="80-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, range }: { color: string; label: string; range: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[9px] font-mono text-white/80 uppercase">{label}</span>
      <span className="text-[9px] font-mono text-gray-500 ml-auto">{range}</span>
    </div>
  );
}