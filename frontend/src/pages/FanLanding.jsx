import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, HeartHandshake, Leaf, ArrowRight } from 'lucide-react';
import '../ArenaControlDesk.css';

export default function FanLanding() {
  const navigate = useNavigate();

  return (
    <div className="master-layout" style={{ justifyContent: 'center', alignItems: 'center', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '1200px', width: '100%', textAlign: 'center' }}>
        
        <header style={{ marginBottom: '5rem' }}>
          <div style={{ color: 'var(--accent-indigo)', fontFamily: '"JetBrains Mono", monospace', fontSize: '1rem', letterSpacing: '4px', marginBottom: '1.5rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
            ArenaMind OS — Fan Experience Portal
          </div>
          <h1 className="fan-hero-title" style={{ fontSize: '5.5rem' }}>
            Find Your Way.<br/> Without Limits.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.3rem', marginTop: '2rem', maxWidth: '800px', margin: '2rem auto 0', lineHeight: '1.6' }}>
            Select a module below to access personalized, AI-driven venue intelligence.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          
          <div className="bento-panel" style={{ padding: '2.5rem', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate('/fan/wayfinding')}>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', padding: '1rem', borderRadius: '50%', display: 'inline-flex', alignSelf: 'flex-start', marginBottom: '1.5rem', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <Navigation size={28} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: '"Outfit", sans-serif', marginBottom: '1rem', color: '#fff' }}>Intelligent Wayfinding</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem', flex: 1 }}>
              Navigate the 3-level stadium complex with mathematically optimized, step-by-step spatial routing.
            </p>
            <div style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontFamily: '"Outfit", sans-serif', marginTop: 'auto' }}>
              Launch Module <ArrowRight size={18} />
            </div>
          </div>

          <div className="bento-panel" style={{ padding: '2.5rem', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate('/fan/accessibility')}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', padding: '1rem', borderRadius: '50%', display: 'inline-flex', alignSelf: 'flex-start', marginBottom: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <HeartHandshake size={28} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: '"Outfit", sans-serif', marginBottom: '1rem', color: '#fff' }}>Accessibility Liaison</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem', flex: 1 }}>
              Coordinate dedicated facility staff for mobility, visual, and sensory accommodation requirements.
            </p>
            <div style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontFamily: '"Outfit", sans-serif', marginTop: 'auto' }}>
              Launch Module <ArrowRight size={18} />
            </div>
          </div>

          <div className="bento-panel" style={{ padding: '2.5rem', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate('/fan/transit')}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '1rem', borderRadius: '50%', display: 'inline-flex', alignSelf: 'flex-start', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <Leaf size={28} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: '"Outfit", sans-serif', marginBottom: '1rem', color: '#fff' }}>Sustainable Transit AI</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem', flex: 1 }}>
              Analyze carbon footprint and receive AI-optimized alternative transit suggestions for your commute.
            </p>
            <div style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontFamily: '"Outfit", sans-serif', marginTop: 'auto' }}>
              Launch Module <ArrowRight size={18} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
