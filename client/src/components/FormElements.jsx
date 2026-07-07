import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';

/**
 * InlineAddSelect — searchable dropdown with "Add new" inline capability
 * Props:
 *   label, options, value, onSelect, onAdd, loading, allowNone, noneLabel, required
 */
export function InlineAddSelect({ options = [], onSelect, onAdd, label, value, loading, allowNone, noneLabel, required }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [addingError, setAddingError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const containerRef = useRef(null);

  const selected = options.find(o => o.id === value);
  const displayText = selected?.name || (value === null && allowNone ? noneLabel : '');

  const filtered = searchTerm
    ? options.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const exactMatch = options.find(o => o.name.toLowerCase() === searchTerm.toLowerCase().trim());

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id) => {
    onSelect(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleAdd = async () => {
    if (!searchTerm.trim() || !onAdd) return;
    setIsAdding(true);
    setAddingError('');
    try {
      const newItem = await onAdd(searchTerm.trim());
      onSelect(newItem.id);
      setIsOpen(false);
      setSearchTerm('');
    } catch (err) {
      setAddingError(err.message || 'Failed to add');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div ref={containerRef} className="dropdown-container">
      {label && <label className={required ? 'required' : ''}>{label}</label>}

      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        {displayText
          ? <><span className="flex-1 text-left">{displayText}</span></>
          : <span className="dropdown-trigger-placeholder">{loading ? 'Loading...' : 'Select…'}</span>
        }
        <svg style={{ width: 12, height: 12, flexShrink: 0, color: 'var(--text-muted)' }} fill="currentColor" viewBox="0 0 16 16">
          <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="dropdown-menu">
            {onAdd && (
              <div className="dropdown-search">
                <input
                  type="text"
                  placeholder="Search or type to add new…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchTerm.trim() && !exactMatch && onAdd) handleAdd();
                    if (e.key === 'Escape') setIsOpen(false);
                  }}
                />
              </div>
            )}

            {allowNone && (
              <div className={`dropdown-item none ${value === null ? 'selected' : ''}`} onClick={() => handleSelect(null)}>
                {noneLabel || 'None'}
              </div>
            )}

            {loading && <div className="dropdown-item text-muted">Loading…</div>}

            {filtered.map(opt => (
              <div
                key={opt.id}
                className={`dropdown-item ${value === opt.id ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.id)}
              >
                {opt.color_display && <span className="color-swatch" style={{ background: opt.color_display }} />}
                {opt.name}
                {opt.is_active === 0 && <span className="text-muted"> (inactive)</span>}
              </div>
            ))}

            {!loading && filtered.length === 0 && !searchTerm && (
              <div className="dropdown-item text-muted">No options available</div>
            )}

            {searchTerm.trim() && !exactMatch && onAdd && (
              <div className="dropdown-item dropdown-add" onClick={handleAdd}>
                {isAdding ? 'Adding…' : `+ Add "${searchTerm.trim()}"`}
                {addingError && <div className="text-error text-xs mt-1">{addingError}</div>}
              </div>
            )}
          </div>
          {/* backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => { setIsOpen(false); setSearchTerm(''); }} />
        </>
      )}
    </div>
  );
}

/**
 * Generic hook for fetching reference data
 */
export function useReferenceData(endpoint, { activeOnly = false } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const url = activeOnly ? `${endpoint}?active_only=true` : endpoint;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWithAuth(url)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [url]);

  const addItem = async (name, extra = {}) => {
    const newItem = await fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify({ name, ...extra }),
    });
    setData(prev => {
      const idx = prev.findIndex(d => d.id === newItem.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newItem;
        return updated;
      }
      return [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name));
    });
    return newItem;
  };

  return { data, loading, error, addItem, setData };
}
