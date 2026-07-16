import React, { useEffect, useState, useRef } from 'react';

export default function StadiumMapVisualizer({ rawPath = [], explorationSteps = [], prunedEdges = [] }) {
  const [graphData, setGraphData] = useState({ nodes: {}, edges: [] });
  const [loading, setLoading] = useState(true);

  // Animation states
  const [animationPhase, setAnimationPhase] = useState(0); // 0: Idle/Pruned, 1: Scanning, 2: Locked
  const [scannedNodes, setScannedNodes] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Single Source of Truth: Fetching live topology from backend
    fetch('http://127.0.0.1:8000/api/v1/fan/venue-graph')
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load stadium topology:", err);
        setLoading(false);
      });
  }, []);

  // Trigger algorithmic animation sequence
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (explorationSteps && explorationSteps.length > 0) {
      setAnimationPhase(1); // Enter scanning phase
      setScannedNodes([]);
      let currentIndex = 0;
      
      // Simulate Dijkstra's expanding search wave
      timerRef.current = setInterval(() => {
        if (currentIndex < explorationSteps.length) {
          setScannedNodes(prev => {
            const nextNode = explorationSteps[currentIndex];
            if (!prev.includes(nextNode)) return [...prev, nextNode];
            return prev;
          });
          currentIndex++;
        } else {
          clearInterval(timerRef.current);
          setAnimationPhase(2); // Lock on!
        }
      }, 100); // 100ms per node evaluation
    } else if (rawPath && rawPath.length > 0) {
      // Fallback if no exploration data but we have a path
      setAnimationPhase(2);
    } else {
      setAnimationPhase(0);
      setScannedNodes([]);
    }
    
    return () => clearInterval(timerRef.current);
  }, [explorationSteps, rawPath]);

  if (loading) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Initializing Topology Map...</div>;
  }

  // Calculate SVG active path lines
  const renderActivePath = () => {
    if (animationPhase !== 2 || !rawPath || rawPath.length < 2) return null;

    const pathElements = [];
    for (let i = 0; i < rawPath.length - 1; i++) {
      const startNodeName = rawPath[i];
      const endNodeName = rawPath[i + 1];
      const startNode = graphData.nodes[startNodeName];
      const endNode = graphData.nodes[endNodeName];

      if (startNode && endNode) {
        // Curve detection
        let pathD = `M ${startNode.x} ${startNode.y} L ${endNode.x} ${endNode.y}`;
        if ((startNodeName === "Concourse 100 - North" && endNodeName === "Concourse 100 - South") || 
            (startNodeName === "Concourse 100 - South" && endNodeName === "Concourse 100 - North")) {
          pathD = `M ${startNode.x} ${startNode.y} Q 150 400 ${endNode.x} ${endNode.y}`;
        }
        if ((startNodeName === "Concourse 200 - North" && endNodeName === "Concourse 200 - South") || 
            (startNodeName === "Concourse 200 - South" && endNodeName === "Concourse 200 - North")) {
          pathD = `M ${startNode.x} ${startNode.y} Q 850 400 ${endNode.x} ${endNode.y}`;
        }

        pathElements.push(
          <path
            key={`path-${i}`}
            d={pathD}
            fill="transparent"
            stroke="var(--accent-cyan)"
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 12px rgba(6, 182, 212, 1))',
              strokeDasharray: '1000',
              strokeDashoffset: '1000',
              animation: `drawPath 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards ${i * 0.2}s`
            }}
          />
        );
      }
    }
    return pathElements;
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="visualizer-container" style={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', position: 'relative' }}>
        
        {/* Clean Abstract Mathematical Background */}
      <div style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, bottom: 0, 
        background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 60%)',
        backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        zIndex: 0 
      }}></div>

      {/* Dynamic CSS Keyframes for SVG animation */}
      <style>
        {`
          @keyframes drawPath {
            to { stroke-dashoffset: 0; }
          }
          @keyframes pulseNode {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.5; box-shadow: 0 0 20px currentColor; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes blinkRed {
            0% { opacity: 0.2; }
            50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 1)); }
            100% { opacity: 0.2; }
          }
          @keyframes radarPing {
            0% { r: 0; opacity: 1; }
            100% { r: 25; opacity: 0; }
          }
          @keyframes tooltipPop {
            from { opacity: 0; transform: scale(0.8) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}
      </style>

      {/* Interactive Overlay: Status */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-base)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
        <div style={{ 
          width: '8px', height: '8px', borderRadius: '50%', 
          background: animationPhase === 1 ? 'var(--accent-amber)' : (animationPhase === 2 ? 'var(--accent-cyan)' : 'var(--text-muted)'),
          boxShadow: animationPhase === 1 ? '0 0 8px var(--accent-amber)' : (animationPhase === 2 ? '0 0 8px var(--accent-cyan)' : 'none'),
          animation: animationPhase === 1 ? 'pulseNode 1s infinite' : 'none'
        }}></div>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {animationPhase === 0 ? "Awaiting Telemetry" : (animationPhase === 1 ? "Algorithm Searching..." : "Route Locked")}
        </span>
      </div>

        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 -80 1000 1000" style={{ display: 'block', position: 'relative', zIndex: 1 }}>
        
        {/* Render all structural edges first (faint background lines) */}
        {graphData.edges.map((edge, idx) => {
          const src = graphData.nodes[edge.source];
          const tgt = graphData.nodes[edge.target];
          if (!src || !tgt) return null;
          
          let pathD = `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
          if ((edge.source === "Concourse 100 - North" && edge.target === "Concourse 100 - South") || 
              (edge.source === "Concourse 100 - South" && edge.target === "Concourse 100 - North")) {
            pathD = `M ${src.x} ${src.y} Q 150 400 ${tgt.x} ${tgt.y}`;
          }
          if ((edge.source === "Concourse 200 - North" && edge.target === "Concourse 200 - South") || 
              (edge.source === "Concourse 200 - South" && edge.target === "Concourse 200 - North")) {
            pathD = `M ${src.x} ${src.y} Q 850 400 ${tgt.x} ${tgt.y}`;
          }

          return (
            <path
              key={`edge-${idx}`}
              d={pathD}
              fill="transparent"
              stroke="var(--border-color)"
              strokeWidth={edge.step_free ? "2" : "2"}
              strokeDasharray={edge.step_free ? "none" : "5,5"}
            />
          );
        })}

        {/* Phase 0: Render Pruned Edges (Danger Zone) */}
        {prunedEdges?.map((edge, idx) => {
          const src = graphData.nodes[edge.source];
          const tgt = graphData.nodes[edge.target];
          if (!src || !tgt) return null;
          
          let pathD = `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
          if ((edge.source === "Concourse 100 - North" && edge.target === "Concourse 100 - South") || 
              (edge.source === "Concourse 100 - South" && edge.target === "Concourse 100 - North")) {
            pathD = `M ${src.x} ${src.y} Q 150 400 ${tgt.x} ${tgt.y}`;
          }
          if ((edge.source === "Concourse 200 - North" && edge.target === "Concourse 200 - South") || 
              (edge.source === "Concourse 200 - South" && edge.target === "Concourse 200 - North")) {
            pathD = `M ${src.x} ${src.y} Q 850 400 ${tgt.x} ${tgt.y}`;
          }

          return (
            <path
              key={`pruned-${idx}`}
              d={pathD}
              fill="transparent"
              stroke="#ef4444" // Red
              strokeWidth="6"
              strokeDasharray="10,10"
              style={{ animation: 'blinkRed 1.5s infinite', strokeLinecap: 'round' }}
            />
          );
        })}

        {/* Render the animated Dijkstra final path */}
        {renderActivePath()}

        {/* Render all nodes */}
        {Object.entries(graphData.nodes).map(([nodeName, node], idx) => {
          const isFinalPath = animationPhase === 2 && rawPath?.includes(nodeName);
          const isStart = rawPath?.[0] === nodeName;
          const isEnd = rawPath?.[rawPath.length - 1] === nodeName;
          
          // Determine if node is currently being scanned
          const isScanned = animationPhase === 1 && scannedNodes.includes(nodeName);
          
          let fillColor = 'var(--bg-card)';
          let strokeColor = 'var(--border-color)';
          let r = "6";

          if (isScanned) {
            fillColor = 'rgba(245, 158, 11, 0.8)'; // Amber scanning
            strokeColor = 'var(--accent-amber)';
            r = "8";
          } else if (isFinalPath) {
            fillColor = 'var(--accent-cyan)';
            strokeColor = 'var(--bg-base)';
            r = "10";
          }

          if (isStart) fillColor = 'var(--accent-green)';
          if (isEnd && animationPhase === 2) fillColor = 'var(--accent-amber)';

          const isHovered = hoveredNode === nodeName;
          const showLabel = isFinalPath || (isScanned && animationPhase === 1) || isHovered;
          
          // Calculate dynamic width based on text length for the badge
          const badgeWidth = Math.max(nodeName.length * 9.5 + 24, 100);

          return (
            <g 
              key={`node-${idx}`} 
              onMouseEnter={() => setHoveredNode(nodeName)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Radar ping effect for currently scanning nodes */}
              {isScanned && nodeName === scannedNodes[scannedNodes.length - 1] && (
                <circle cx={node.x} cy={node.y} r="0" fill="none" stroke="var(--accent-amber)" strokeWidth="2" style={{ animation: 'radarPing 1s ease-out infinite' }} />
              )}
              
              <circle
                cx={node.x}
                cy={node.y}
                r={isHovered ? parseInt(r) + 2 : r}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2"
                style={{
                  transition: 'all 0.3s ease',
                  filter: isFinalPath || isHovered ? 'drop-shadow(0 0 12px currentColor)' : (isScanned ? 'drop-shadow(0 0 8px currentColor)' : 'none'),
                  animation: ((isStart || isEnd) && animationPhase === 2) ? 'pulseNode 2s infinite' : 'none',
                  transformOrigin: `${node.x}px ${node.y}px`
                }}
              />
              
              {/* Contextual Labels / Tooltips */}
              {showLabel && (
                <g style={{ 
                  animation: isHovered && !isFinalPath ? 'tooltipPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none',
                  transformOrigin: `${node.x}px ${node.y - 25}px`
                }}>
                  <rect
                    x={node.x - (badgeWidth / 2)}
                    y={node.y - 40}
                    width={badgeWidth}
                    height="28"
                    rx="14"
                    fill={isHovered ? 'var(--bg-base)' : 'var(--bg-card)'}
                    stroke={isHovered ? 'var(--accent-cyan)' : 'var(--border-color)'}
                    strokeWidth="1"
                    style={{ 
                      filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
                      transition: 'all 0.2s ease'
                    }}
                  />
                  <text
                    x={node.x}
                    y={node.y - 20}
                    fill={isHovered ? 'var(--text-main)' : 'var(--text-muted)'}
                    fontSize={isFinalPath ? "16" : "14"}
                    fontFamily='"Outfit", sans-serif'
                    fontWeight="600"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', transition: 'all 0.2s' }}
                  >
                    {nodeName}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Render Edge Weights (Distances) last so they sit on top of the paths AND nodes */}
        {graphData.edges.map((edge, idx) => {
          const src = graphData.nodes[edge.source];
          const tgt = graphData.nodes[edge.target];
          if (!src || !tgt) return null;
          
          let midX = (src.x + tgt.x) / 2;
          let midY = (src.y + tgt.y) / 2;
          
          if ((edge.source === "Concourse 100 - North" && edge.target === "Concourse 100 - South") || 
              (edge.source === "Concourse 100 - South" && edge.target === "Concourse 100 - North")) {
            midX = 150 + ((500 - 150) / 2); // approximate midpoint of quadratic curve
            midY = 400;
          }
          if ((edge.source === "Concourse 200 - North" && edge.target === "Concourse 200 - South") || 
              (edge.source === "Concourse 200 - South" && edge.target === "Concourse 200 - North")) {
            midX = 850 - ((850 - 500) / 2); // approximate midpoint of quadratic curve
            midY = 400;
          }
          
          return (
            <g key={`weight-${idx}`}>
              <rect
                x={midX - 24} y={midY - 12}
                width="48" height="24" rx="6"
                fill="var(--bg-card)"
                stroke="var(--border-color)" strokeWidth="1"
              />
              <text
                x={midX} y={midY + 4}
                fill="var(--text-main)"
                fontSize="12"
                fontFamily='"JetBrains Mono", monospace'
                fontWeight="600"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {edge.distance}m
              </text>
            </g>
          );
        })}
          </svg>
        </div>
      </div>
      
      {/* Map Legend Overlay */}
      <div className="map-legend">
        <h3>Map Legend</h3>
        
        {/* Legend Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }}></div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Origin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-amber)', boxShadow: '0 0 8px var(--accent-amber)' }}></div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Destination</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 8px var(--accent-cyan)' }}></div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Optimal Route</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.4rem' }}>
          <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="var(--border-color)" strokeWidth="2" /></svg>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Step-Free Path</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="var(--border-color)" strokeWidth="2" strokeDasharray="3,3" /></svg>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stairs / Escalators</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#ef4444" strokeWidth="3" strokeDasharray="5,5" /></svg>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-red)' }}>Pruned (Inaccessible)</span>
        </div>
      </div>
    </div>
  );
}
