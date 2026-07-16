import React, { useState } from 'react';
import { Radio, Send } from 'lucide-react';
import '../ArenaControlDesk.css';

export default function OperationsFeed({ tasks, dispatchAI }) {
  const [radioInput, setRadioInput] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);

  const handleTransmit = async (e) => {
    e.preventDefault();
    if (!radioInput.trim()) return;
    
    setIsTransmitting(true);
    await dispatchAI(radioInput);
    setRadioInput('');
    setIsTransmitting(false);
  };

  return (
    <div className="bento-panel operations-panel">
      <div className="panel-header feed-header-custom">
        <div className="feed-title-row">
          <h2>Live Operations Feed</h2>
          <span className="live-indicator">● LIVE</span>
        </div>
        
        {/* Field Agent Radio Input */}
        <form onSubmit={handleTransmit} className="radio-form">
          <input 
            type="text" 
            placeholder="Field Agent Radio: Type emergency here..." 
            value={radioInput}
            onChange={(e) => setRadioInput(e.target.value)}
            disabled={isTransmitting}
            className="radio-input"
          />
          <button type="submit" disabled={isTransmitting} className="radio-submit">
            <Send size={16} />
          </button>
        </form>
      </div>

      <div className="feed-scroll">
        {tasks.length === 0 ? (
          <div className="empty-state">System monitoring... Awaiting field agent radio transmissions.</div>
        ) : (
          tasks.map((task, idx) => (
            <div key={idx} className={`feed-item border-${task.priority_level.toLowerCase()}`}>
              <div className="feed-meta">
                <span className="staff-tag"><Radio size={14} /> {task.required_staff_role}</span>
                <span className={`priority-pill bg-${task.priority_level.toLowerCase()}`}>
                  {task.priority_level}
                </span>
              </div>
              <p className="feed-desc">{task.translated_english_summary}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
