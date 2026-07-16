import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { processFanQuery } from '../infrastructure/arena_telemetry_gateway';
import '../ArenaControlDesk.css';

export default function FanAccessibility({ globalLanguage }) {
  const [accDest, setAccDest] = useState('First Aid 100');
  const [accNeeds, setAccNeeds] = useState('Wheelchair / Mobility Assistance');
  const [accLoading, setAccLoading] = useState(false);
  const [accResult, setAccResult] = useState('');

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i} style={{ display: 'block', marginBottom: '0.8rem' }}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} style={{ color: 'var(--accent-amber)' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </span>
      );
    });
  };

  const handleQuery = async () => {
    setAccLoading(true);
    setAccResult('');
    try {
      const res = await processFanQuery({ 
        module_type: 'G2_ACCESS', 
        destination: accDest, 
        needs: accNeeds,
        language: globalLanguage
      });
      setAccResult(res.structured_content);
    } catch {
      setAccResult("AI Core offline or unreachable. Please try again.");
    } finally {
      setAccLoading(false);
    }
  };

  const LocationOptions = () => (
    <>
      <optgroup label="--- EXTERIOR GATES ---">
        <option value="Gate North">Gate North</option>
        <option value="Gate South">Gate South</option>
        <option value="Gate East">Gate East</option>
        <option value="Gate West">Gate West</option>
      </optgroup>
      <optgroup label="--- SEATING ZONES ---">
        <option value="Section 101">Section 101 (Lower Bowl)</option>
        <option value="Section 105">Section 105 (Lower Bowl)</option>
        <option value="Section 205">Section 205 (Club)</option>
        <option value="VIP Suite A">VIP Suite A</option>
      </optgroup>
      <optgroup label="--- DEDICATED FACILITIES ---">
        <option value="First Aid 100">First Aid Station 100</option>
        <option value="First Aid 200">First Aid Station 200</option>
        <option value="Sensory Room A">Sensory Room A</option>
      </optgroup>
    </>
  );

  return (
    <div className="master-layout" style={{ maxWidth: '1200px' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="fan-hero-title">Accessibility Liaison</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.4rem' }}>Select your destination and requirement. We will dispatch the necessary staff and protocol.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
        
        {/* Left Side: Form */}
        <div className="bento-panel padded-panel">
          <div style={{ marginBottom: '2rem' }}>
            <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Target Location</label>
            <select className="radio-input" style={{ width: '100%', height: '42px', fontSize: '0.9rem', padding: '0 1rem' }} value={accDest} onChange={e => setAccDest(e.target.value)}>
              <LocationOptions />
            </select>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Required Support Protocol</label>
            <select className="radio-input" style={{ width: '100%', height: '42px', fontSize: '0.9rem', padding: '0 1rem' }} value={accNeeds} onChange={e => setAccNeeds(e.target.value)}>
              <option>Wheelchair / Mobility Assistance</option>
              <option>Hearing Impairment Support</option>
              <option>Visual Impairment Guide</option>
              <option>Sensory-friendly / Low-Stimulation Route</option>
            </select>
          </div>

          <button 
            className="radio-submit btn-warning" 
            style={{ width: '100%', padding: '1rem', fontSize: '0.95rem', borderRadius: '8px' }}
            onClick={handleQuery}
            disabled={accLoading}
          >
            {accLoading ? <Loader2 className="spin-anim" size={20} /> : "Request Accommodation Plan"}
          </button>
        </div>

        {/* Right Side: Output */}
        <div className="bento-panel padded-panel">
          <h3 style={{ fontSize: '1.1rem', fontFamily: '"Outfit", sans-serif', marginBottom: '1.5rem', color: 'var(--accent-amber)' }}>Dispatched Protocol</h3>
          {accLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-muted)' }}>
              <Loader2 className="spin-anim" size={32} style={{ marginBottom: '1rem', color: 'var(--accent-amber)' }} />
              <p style={{ fontSize: '0.9rem' }}>Evaluating facility resources and drafting protocol...</p>
            </div>
          ) : accResult ? (
            <div style={{ fontSize: '1rem', lineHeight: '1.6', fontFamily: '"Outfit", sans-serif', color: 'var(--text-main)' }}>
              {renderMarkdown(accResult)}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center' }}>
              Awaiting parameters.<br/>Submit request to dispatch accommodation team.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
