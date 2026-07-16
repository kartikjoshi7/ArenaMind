import React, { useState } from 'react';
import { ArrowDownUp, Loader2 } from 'lucide-react';
import { processFanQuery } from '../infrastructure/arena_telemetry_gateway';
import StadiumMapVisualizer from '../components/StadiumMapVisualizer';
import '../ArenaControlDesk.css';

export default function FanWayfinding({ globalLanguage }) {
  const [navOrigin, setNavOrigin] = useState('Gate North');
  const [navDest, setNavDest] = useState('Section 205');
  const [navNeeds, setNavNeeds] = useState('standard');
  const [navLoading, setNavLoading] = useState(false);
  const [navResult, setNavResult] = useState('');
  const [rawPath, setRawPath] = useState([]);
  const [explorationSteps, setExplorationSteps] = useState([]);
  const [prunedEdges, setPrunedEdges] = useState([]);

  const handleQuery = async () => {
    setNavLoading(true);
    setNavResult('');
    setRawPath([]);
    setExplorationSteps([]);
    setPrunedEdges([]);
    try {
      const res = await processFanQuery({ 
        module_type: 'G1_PATHFINDING', 
        origin: navOrigin, 
        destination: navDest, 
        needs: navNeeds,
        language: globalLanguage
      });
      setNavResult(res.structured_content);
      if (res.raw_path) setRawPath(res.raw_path);
      if (res.exploration_steps) setExplorationSteps(res.exploration_steps);
      if (res.pruned_edges) setPrunedEdges(res.pruned_edges);
    } catch (err) {
      setNavResult("AI Core offline or unreachable. Please try again.");
    } finally {
      setNavLoading(false);
    }
  };

  const LocationOptions = () => (
    <>
      <optgroup label="--- EXTERIOR GATES ---">
        <option value="Gate North">Gate North (Main Entry)</option>
        <option value="Gate South">Gate South</option>
        <option value="Gate East">Gate East (Stairs Only)</option>
        <option value="Gate West">Gate West</option>
      </optgroup>
      <optgroup label="--- LEVEL 100: LOWER BOWL ---">
        <option value="Concourse 100 - North">Concourse 100 - North</option>
        <option value="Concourse 100 - South">Concourse 100 - South</option>
        <option value="Section 101">Section 101</option>
        <option value="Section 102">Section 102</option>
        <option value="Section 105">Section 105</option>
        <option value="Restrooms 100">Restrooms 100</option>
        <option value="First Aid 100">First Aid Station 100</option>
        <option value="Food Court 100">Food Court 100</option>
        <option value="Merchandise MegaStore">Merchandise MegaStore</option>
      </optgroup>
      <optgroup label="--- LEVEL 200: CLUB SEATING ---">
        <option value="Concourse 200 - North">Concourse 200 - North</option>
        <option value="Concourse 200 - South">Concourse 200 - South</option>
        <option value="Section 201">Section 201 (Club)</option>
        <option value="Section 205">Section 205 (Club)</option>
        <option value="Restrooms 200">Restrooms 200</option>
        <option value="First Aid 200">First Aid Station 200</option>
        <option value="Premium Dining 200">Premium Dining 200</option>
      </optgroup>
      <optgroup label="--- VIP LEVEL ---">
        <option value="VIP Concourse">VIP Concourse</option>
        <option value="VIP Suite A">VIP Suite A</option>
        <option value="VIP Suite B">VIP Suite B</option>
      </optgroup>
      <optgroup label="--- TRANSIT HUBS ---">
        <option value="Elevator Bank 1 (North)">Elevator Bank 1 (North)</option>
        <option value="Elevator Bank 2 (South)">Elevator Bank 2 (South)</option>
        <option value="Grand Staircase (North)">Grand Staircase (North)</option>
        <option value="Grand Staircase (South)">Grand Staircase (South)</option>
      </optgroup>
    </>
  );

  return (
    <div className="master-layout" style={{ maxWidth: '1200px' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="fan-hero-title">Intelligent Wayfinding</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.4rem' }}>Select your start and end points below. The routing engine will calculate your optimal path.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Top Section: Form */}
        <div className="bento-panel padded-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', alignItems: 'end' }}>
            
            <div style={{ position: 'relative' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="origin-select" className="input-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Origin</label>
                <select id="origin-select" className="radio-input" style={{ width: '100%', height: '42px', fontSize: '0.9rem', padding: '0 1rem' }} value={navOrigin} onChange={e => setNavOrigin(e.target.value)} aria-label="Select Origin Location">
                  <LocationOptions />
                </select>
              </div>

              {/* Swap Section Icon */}
              <button 
                onClick={() => {
                  const temp = navOrigin;
                  setNavOrigin(navDest);
                  setNavDest(temp);
                }}
                title="Swap Origin and Destination"
                aria-label="Swap Origin and Destination"
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: 'calc(0% - 1.5rem)',
                  transform: 'translateY(-50%)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  color: 'var(--accent-cyan)'
                }}
              >
                <ArrowDownUp size={16} />
              </button>

              <div>
                <label htmlFor="dest-select" className="input-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Destination</label>
                <select id="dest-select" className="radio-input" style={{ width: '100%', height: '42px', fontSize: '0.9rem', padding: '0 1rem' }} value={navDest} onChange={e => setNavDest(e.target.value)} aria-label="Select Destination Location">
                  <LocationOptions />
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
              <label className="checkbox-label" style={{ fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" className="custom-checkbox" style={{ width: '18px', height: '18px' }} checked={navNeeds === 'step_free'} onChange={e => setNavNeeds(e.target.checked ? 'step_free' : 'standard')} aria-label="Strictly step-free route" />
                Strictly step-free route
              </label>
            </div>

            <button 
              className="radio-submit btn-primary" 
              style={{ width: '100%', padding: '0', height: '42px', fontSize: '0.95rem', borderRadius: '8px' }}
              onClick={handleQuery}
              disabled={navLoading}
              aria-label="Execute Pathfinding Math"
            >
              {navLoading ? <Loader2 className="spin-anim" size={20} /> : "Execute Pathfinding Math"}
            </button>
          </div>
        </div>

        {/* Bottom Section: Output Map */}
        <div className="bento-panel padded-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif', marginBottom: '1.5rem', color: '#0369a1' }}>Live Topology Map</h2>
          
          <div className="topology-map-container">
            <StadiumMapVisualizer 
              rawPath={rawPath} 
              explorationSteps={explorationSteps}
              prunedEdges={prunedEdges} 
            />
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '8px', borderLeft: '4px solid var(--accent-cyan)' }} aria-live="polite">
            {navLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--accent-cyan)' }}>
                <Loader2 className="spin-anim" size={24} />
                <span style={{ fontSize: '0.95rem' }}>Analyzing {navNeeds === 'step_free' ? 'step-free ' : ''}edges and calculating shortest path...</span>
              </div>
            ) : navResult ? (
              <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                {navResult}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Awaiting parameters. Select origin and destination to generate spatial map.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
