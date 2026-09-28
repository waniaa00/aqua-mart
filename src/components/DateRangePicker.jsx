import { useState } from 'react';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '12m', label: '12 Months' },
  { key: 'custom', label: 'Custom' },
];

// Predefined-range chips + a custom start/end form, matching this
// codebase's existing .filter-chip pattern (Shop/Gallery filters) and
// BookingFlow's date-input convention. Emits { preset, start, end }
// (start/end are ISO 'YYYY-MM-DD', only meaningful when preset==='custom').
// Rejects an invalid custom range client-side before calling onChange —
// FR-022.
export default function DateRangePicker({ value, onChange, maxCustomDays = 366 }) {
  const [draftStart, setDraftStart] = useState(value?.start ?? '');
  const [draftEnd, setDraftEnd] = useState(value?.end ?? '');
  const [customError, setCustomError] = useState('');
  // Separate from value.preset==='custom': that only becomes true once a
  // valid custom range has actually been applied. This tracks "the custom
  // fields should be visible," which starts the moment the chip is clicked.
  const [inCustomMode, setInCustomMode] = useState(value?.preset === 'custom');

  function selectPreset(key) {
    setCustomError('');
    if (key === 'custom') {
      // Switching into custom mode just reveals the start/end fields —
      // it doesn't call onChange with a real range yet (there isn't one
      // until Apply), but the parent still needs to know we're in custom
      // mode so it renders those fields instead of re-fetching immediately.
      setInCustomMode(true);
    } else {
      setInCustomMode(false);
      onChange({ preset: key, start: null, end: null });
    }
  }

  function applyCustom() {
    if (!draftStart || !draftEnd) {
      setCustomError('Pick both a start and end date.');
      return;
    }
    if (draftEnd < draftStart) {
      setCustomError('End date must be on or after the start date.');
      return;
    }
    const days = (new Date(draftEnd) - new Date(draftStart)) / (1000 * 60 * 60 * 24);
    if (days > maxCustomDays) {
      setCustomError(`Custom range can't exceed ${maxCustomDays} days.`);
      return;
    }
    setCustomError('');
    onChange({ preset: 'custom', start: draftStart, end: draftEnd });
  }

  return (
    <div className="date-range-picker">
      <div className="filter-row">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`filter-chip ${(p.key === 'custom' ? inCustomMode : !inCustomMode && value?.preset === p.key) ? 'active' : ''}`}
            onClick={() => selectPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {inCustomMode && (
        <div className="date-range-custom">
          <div className="field">
            <label htmlFor="drp-start">Start</label>
            <input
              id="drp-start"
              type="date"
              className="input"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="drp-end">End</label>
            <input
              id="drp-end"
              type="date"
              className="input"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={applyCustom}>
            Apply
          </button>
          {customError && <p className="muted" style={{ color: 'var(--danger)' }}>{customError}</p>}
        </div>
      )}
    </div>
  );
}
