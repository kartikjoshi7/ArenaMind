import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import './ArenaControlDesk.css';

// Import our decoupled structural components
import TelemetryMap from './components/TelemetryMap';
import OperationsFeed from './components/OperationsFeed';
import SectorManifestTable from './components/SectorManifestTable';

// Infrastructure Gateway Layer
import { evaluateSectorTelemetry, dispatchVolunteerTriage, fetchSimulationScenario } from './infrastructure/arena_telemetry_gateway';

const STRUCTURAL_BASELINE = [
  { sector_id: 'GATE-NORTH', max_capacity: 1000, current_occupancy: 200 },
  { sector_id: 'GATE-SOUTH', max_capacity: 1500, current_occupancy: 450 },
  { sector_id: 'GATE-EAST', max_capacity: 1200, current_occupancy: 300 },
  { sector_id: 'GATE-WEST', max_capacity: 1200, current_occupancy: 350 },
];

export default function ArenaControlDesk() {
  const [sectors, setSectors] = useState(STRUCTURAL_BASELINE);
  const [triageFeed, setTriageFeed] = useState([]);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  
  // Ref locks for safe API polling
  const isTelemetryFetching = useRef(false);
  const isRadioFetching = useRef(false);
  const sectorsRef = useRef(sectors);
  
  // Keep ref in sync for the interval without triggering re-renders inside useEffect
  useEffect(() => {
    sectorsRef.current = sectors;
  }, [sectors]);
  
  // Real-time local state update for smooth slider UX
  const updateSectorCapacity = (sector_id, new_occupancy) => {
    setSectors(prev => prev.map(s => 
      s.sector_id === sector_id ? { ...s, current_occupancy: new_occupancy } : s
    ));
  };

  // API Call triggered on slider mouse up
  const evaluateSector = async (sector_id) => {
    const sector = sectors.find(s => s.sector_id === sector_id);
    if (!sector) return;

    // Only hit backend if we crossed the 85% threshold to save API calls
    if ((sector.current_occupancy / sector.max_capacity) < 0.85) {
        // Clear any active alerts if it drops below 85%
        setSectors(prev => prev.map(s => 
            s.sector_id === sector_id ? { ...s, alertData: null } : s
        ));
        return;
    }

    try {
      const alertData = await evaluateSectorTelemetry(
        sector.sector_id, 
        sector.max_capacity, 
        sector.current_occupancy
      );
      
      setSectors(prev => prev.map(s => 
        s.sector_id === sector_id ? { ...s, alertData: alertData } : s
      ));

    } catch (error) {
      console.error("Simulation API Error:", error);
    }
  };

  const dispatchAI = async (raw_transcript) => {
    try {
      const taskData = await dispatchVolunteerTriage(raw_transcript);
      setTriageFeed(prev => [taskData, ...prev]);
    } catch (error) {
      console.error("AI Dispatch API Error:", error);
    }
  };

  // Auto-Pilot Simulation Loop (with Strict Network Safety Locks)
  useEffect(() => {
    if (!isAutoPilot) return;

    const runTelemetryDrift = async () => {
      if (isTelemetryFetching.current) return;
      isTelemetryFetching.current = true;

      try {
        // Randomly drift one sector to simulate a surge
        const targetSector = sectorsRef.current[Math.floor(Math.random() * sectorsRef.current.length)];
        
        // Push occupancy up by 5-15% of max capacity
        const surgeAmount = Math.floor(targetSector.max_capacity * (0.05 + Math.random() * 0.10));
        const newOccupancy = Math.min(targetSector.max_capacity, targetSector.current_occupancy + surgeAmount);
        
        // React UI Update
        setSectors(prev => prev.map(s => 
          s.sector_id === targetSector.sector_id ? { ...s, current_occupancy: newOccupancy } : s
        ));
        
        // Wait 500ms for UI to breathe, then hit the backend with the new occupancy
        setTimeout(async () => {
            if ((newOccupancy / targetSector.max_capacity) >= 0.85) {
                try {
                    const alertData = await evaluateSectorTelemetry(targetSector.sector_id, targetSector.max_capacity, newOccupancy);
                    setSectors(prev => prev.map(s => 
                      s.sector_id === targetSector.sector_id ? { ...s, alertData: alertData } : s
                    ));
                } catch (e) { console.error(e); }
            } else {
                setSectors(prev => prev.map(s => 
                    s.sector_id === targetSector.sector_id ? { ...s, alertData: null } : s
                ));
            }
            isTelemetryFetching.current = false;
        }, 500);
      } catch (err) {
        console.error("Telemetry Loop Error", err);
        isTelemetryFetching.current = false;
      }
    };

    const runRadioChatter = async () => {
      if (isRadioFetching.current) return;
      isRadioFetching.current = true;

      try {
        const data = await fetchSimulationScenario();
        await dispatchAI(data.scenario);
      } catch (error) {
        console.error("Auto-Pilot Radio Fetch Error:", error);
      } finally {
        isRadioFetching.current = false;
      }
    };

    // Execute immediately so the user sees instant feedback!
    runTelemetryDrift();
    runRadioChatter();

    // Since our network locks are solid, we can safely speed up the demo intervals
    const telemetryInterval = setInterval(runTelemetryDrift, 5000);
    const radioInterval = setInterval(runRadioChatter, 15000);

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(radioInterval);
      isTelemetryFetching.current = false;
      isRadioFetching.current = false;
    };
  }, [isAutoPilot]);

  return (
    <div className="master-layout">
      <header className="system-header">
        <h1>ArenaMind <span>Interactive_Systems</span></h1>
        <button 
            className={`btn-primary ${isAutoPilot ? 'btn-success' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.3s ease' }}
            onClick={() => setIsAutoPilot(!isAutoPilot)}
        >
            {isAutoPilot ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {isAutoPilot ? 'AUTO-PILOT ACTIVE' : 'ENGAGE AUTO-PILOT'}
        </button>
      </header>

      <main className="bento-grid">
        <TelemetryMap sectors={sectors} />
        <OperationsFeed tasks={triageFeed} dispatchAI={dispatchAI} />
        <SectorManifestTable 
          sectors={sectors} 
          updateSectorCapacity={updateSectorCapacity} 
          evaluateSector={evaluateSector} 
        />
      </main>
    </div>
  );
}
