import React from 'react';
import '../ArenaControlDesk.css';

export default function TelemetryMap({ sectors }) {
  // Defensive check, render basic nodes if empty
  const nodes = sectors.length > 0 ? sectors : [
    { sector_id: 'N-GATE', utilization: 0 },
    { sector_id: 'S-GATE', utilization: 0 },
    { sector_id: 'E-GATE', utilization: 0 },
    { sector_id: 'W-GATE', utilization: 0 }
  ];

  return (
    <div className="bento-panel map-panel">
      <div className="panel-header">
        <h2>Structural Telemetry Map</h2>
        <span className="live-indicator">● SENSORS ACTIVE</span>
      </div>
      <div className="map-container">
        {/* Abstract SVG representation to avoid structural cloning */}
        <svg viewBox="0 0 400 300" className="stadium-svg">
          {/* Base structure */}
          <ellipse cx="200" cy="150" rx="140" ry="80" className="stadium-ring" />
          <ellipse cx="200" cy="150" rx="100" ry="50" className="stadium-pitch" />
          
          {/* Nodes placed around the ellipse */}
          {nodes.map((node, i) => {
            const angle = (i * (360 / nodes.length)) * (Math.PI / 180);
            const cx = 200 + 140 * Math.cos(angle);
            const cy = 150 + 80 * Math.sin(angle);
            const isBreach = (node.current_occupancy / node.max_capacity * 100) >= 85;
            const utilText = node.max_capacity ? Math.round((node.current_occupancy / node.max_capacity) * 100) + '%' : '0%';
            
            return (
              <g key={node.sector_id || i} className="map-node">
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r="18" 
                  className={isBreach ? 'node-critical pulse-anim' : 'node-nominal'} 
                />
                <text x={cx} y={cy - 25} className="node-label" textAnchor="middle">{node.sector_id}</text>
                <text x={cx} y={cy + 4} className="node-value" textAnchor="middle">{utilText}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
