import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { processFanQuery } from '../infrastructure/arena_telemetry_gateway';
import '../ArenaControlDesk.css';

export default function FanTransit({ globalLanguage }) {
  const [ecoOrigin, setEcoOrigin] = useState('15');
  const [ecoNeeds, setEcoNeeds] = useState('Personal Vehicle');
  const [ecoLoading, setEcoLoading] = useState(false);
  const [ecoResult, setEcoResult] = useState('');

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i} style={{ display: 'block', marginBottom: '0.8rem' }}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} style={{ color: 'var(--accent-green)' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </span>
      );
    });
  };

  const handleQuery = async () => {
    setEcoLoading(true);
    setEcoResult('');
    try {
      const res = await processFanQuery({ 
        module_type: 'G3_TRANSIT', 
        origin: ecoOrigin, 
        needs: ecoNeeds,
        language: globalLanguage
      });
      setEcoResult(res.structured_content);
    } catch {
      setEcoResult("AI Core offline or unreachable. Please try again.");
    } finally {
      setEcoLoading(false);
    }
  };

  return (
    <div className="master-layout" style={{ maxWidth: '1200px' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="fan-hero-title">Sustainable Transit AI</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.4rem' }}>Enter your commute details. Our AI will analyze your environmental impact and suggest optimizations.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
        
        {/* Left Side: Form */}
        <div className="bento-panel padded-panel">
          <div style={{ marginBottom: '2rem' }}>
            <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Estimated Commute Distance (KM)</label>
            <input type="number" className="radio-input" style={{ width: '100%', height: '42px', fontSize: '0.9rem', padding: '0 1rem' }} value={ecoOrigin} onChange={e => setEcoOrigin(e.target.value)} aria-label="Estimated Commute Distance in Kilometers" />
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Planned Transit Mode</label>
            <select className="radio-input" style={{ width: '100%', height: '42px', fontSize: '0.9rem', padding: '0 1rem' }} value={ecoNeeds} onChange={e => setEcoNeeds(e.target.value)} aria-label="Planned Transit Mode">
              <option>Walking / Bicycle</option>
              <option>Metro / Bus (Public Transit)</option>
              <option>Rideshare / Taxi</option>
              <option>Personal Vehicle</option>
            </select>
          </div>

          <button 
            className="radio-submit btn-success" 
            style={{ width: '100%', padding: '1rem', fontSize: '0.95rem', borderRadius: '8px' }}
            onClick={handleQuery}
            disabled={ecoLoading}
            aria-label="Execute Impact Analysis"
          >
            {ecoLoading ? <Loader2 className="spin-anim" size={20} /> : "Execute Impact Analysis"}
          </button>
        </div>

        {/* Right Side: Output */}
        <div className="bento-panel padded-panel" aria-live="polite">
          <h3 style={{ fontSize: '1.1rem', fontFamily: '"Outfit", sans-serif', marginBottom: '1.5rem', color: 'var(--accent-green)' }}>Environmental Analysis</h3>
          {ecoLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-muted)' }}>
              <Loader2 className="spin-anim" size={32} style={{ marginBottom: '1rem', color: 'var(--accent-green)' }} />
              <p style={{ fontSize: '0.9rem' }}>Calculating carbon offsets and processing alternative routes...</p>
            </div>
          ) : ecoResult ? (
            <div style={{ fontSize: '1rem', lineHeight: '1.6', fontFamily: '"Outfit", sans-serif', color: 'var(--text-main)' }}>
              {renderMarkdown(ecoResult)}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center' }}>
              Awaiting parameters.<br/>Submit your planned commute to view its impact.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
