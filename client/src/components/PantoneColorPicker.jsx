import { useState, useRef, useEffect } from 'react';
import { PANTONE_COLORS, searchPantone } from '../data/pantoneColors';

/**
 * PantoneColorPicker
 * Props:
 *   value: { color_name, pantone_code, pantone_name, color_display }
 *   onChange: (colorObj) => void
 */
export default function PantoneColorPicker({ value = {}, onChange }) {
  const [query, setQuery] = useState(value.pantone_name || value.color_name || '');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPantone, setSelectedPantone] = useState(
    value.pantone_code ? { code: value.pantone_code, name: value.pantone_name, hex: value.color_display } : null
  );
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // If no pantone selected, use free text as color_name
        if (!selectedPantone && query.trim()) {
          onChange({ color_name: query.trim(), pantone_code: null, pantone_name: null, color_display: null });
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, selectedPantone, onChange]);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    setSelectedPantone(null);
    if (q.length >= 1) {
      setResults(searchPantone(q));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
    // Update parent with free text as fallback
    onChange({ color_name: q.trim(), pantone_code: null, pantone_name: null, color_display: null });
  };

  const handleSelect = (pantone) => {
    setSelectedPantone(pantone);
    setQuery(pantone.name);
    setIsOpen(false);
    setResults([]);
    onChange({
      color_name: pantone.name,
      pantone_code: pantone.code,
      pantone_name: pantone.name,
      color_display: pantone.hex,
    });
  };

  const handleClear = () => {
    setSelectedPantone(null);
    setQuery('');
    setResults([]);
    onChange({ color_name: '', pantone_code: null, pantone_name: null, color_display: null });
    inputRef.current?.focus();
  };

  const displayHex = selectedPantone?.hex || value.color_display;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label className="required">Color (Pantone or free text)</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Color swatch preview */}
        <div
          style={{
            width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
            background: displayHex || 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            flexShrink: 0,
            transition: 'background 0.2s'
          }}
          title={displayHex || 'No color selected'}
        />
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={() => query.length >= 1 && setIsOpen(true)}
            placeholder="e.g. Navy Blue, Fiesta, 19-1664…"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: '18px', lineHeight: 1
              }}
            >×</button>
          )}
        </div>
      </div>

      {selectedPantone && (
        <div style={{ marginTop: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--accent)' }}>Pantone {selectedPantone.code} TCX</span>
          {' — '}{selectedPantone.name}
        </div>
      )}

      {!selectedPantone && query.trim() && !isOpen && (
        <div style={{ marginTop: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Using free-text color name "{query.trim()}" (no Pantone match selected)
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="pantone-dropdown">
          {results.map((p, i) => (
            <div
              key={`${p.code}-${i}`}
              className="pantone-option"
              onClick={() => handleSelect(p)}
            >
              <div
                className="pantone-swatch"
                style={{ background: p.hex }}
              />
              <div className="pantone-info">
                <div className="pantone-name">{p.name}</div>
                <div className="pantone-code">Pantone {p.code} TCX</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
