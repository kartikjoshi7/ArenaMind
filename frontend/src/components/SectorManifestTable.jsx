import React from 'react';
import '../ArenaControlDesk.css';

export default function SectorManifestTable({ sectors, updateSectorCapacity, evaluateSector }) {
  return (
    <div className="bento-panel table-panel">
      <div className="panel-header">
        <h2>Gate Manifest & Capacity Control</h2>
        <span className="subtitle-hint">Drag sliders to simulate crowd surges</span>
      </div>
      <div className="table-container">
        <table className="manifest-table">
          <thead>
            <tr>
              <th>SECTOR / GATE</th>
              <th>LIVE OCCUPANCY</th>
              <th>MAX CAPACITY</th>
              <th>MANUAL OVERRIDE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector) => {
              const util = Math.min((sector.current_occupancy / sector.max_capacity) * 100, 100).toFixed(1);
              const isBreached = util >= 85;
              return (
                <tr key={sector.sector_id}>
                  <td className="fw-bold">{sector.sector_id}</td>
                  <td className="metric-col">{sector.current_occupancy.toLocaleString()}</td>
                  <td className="metric-col">{sector.max_capacity.toLocaleString()}</td>
                  <td className="slider-col">
                    <input 
                      type="range" 
                      min="0" 
                      max={sector.max_capacity} 
                      value={sector.current_occupancy}
                      onChange={(e) => updateSectorCapacity(sector.sector_id, parseInt(e.target.value))}
                      onMouseUp={() => evaluateSector(sector.sector_id)}
                      onTouchEnd={() => evaluateSector(sector.sector_id)}
                      className={`capacity-slider ${isBreached ? 'slider-danger' : 'slider-safe'}`}
                    />
                    <span className={`util-text ${isBreached ? 'text-danger' : ''}`}>{util}%</span>
                  </td>
                  <td>
                    <span className={`status-tag ${isBreached ? 'tag-critical' : 'tag-nominal'}`}>
                      {isBreached ? 'ROUTING ACTIVE' : 'OPTIMAL'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
