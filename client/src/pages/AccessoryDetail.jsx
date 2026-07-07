import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import PantoneColorPicker from '../components/PantoneColorPicker';

export default function AccessoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [usageForm, setUsageForm] = useState({ quantity_used: '', date_used: new Date().toISOString().split('T')[0], used_for: '', notes: '' });
  const [adjForm, setAdjForm] = useState({ quantity_delta: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [isEditingColor, setIsEditingColor] = useState(false);
  const [colorForm, setColorForm] = useState(null);

  const load = () => {
    setLoading(true);
    fetchWithAuth(`/accessories/${id}`).then(d => { setEntry(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(load, [id]);

  const logUsage = async (e) => {
    e.preventDefault();
    setSubmitting(true); setMsg('');
    try {
      await fetchWithAuth(`/accessories/${id}/usage`, {
        method: 'POST',
        body: JSON.stringify({ ...usageForm, quantity_used: parseFloat(usageForm.quantity_used) }),
      });
      setMsg('Usage logged ✓');
      setUsageForm({ quantity_used: '', date_used: new Date().toISOString().split('T')[0], used_for: '', notes: '' });
      load();
    } catch (err) { setMsg('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const logAdjustment = async (e) => {
    e.preventDefault();
    setSubmitting(true); setMsg('');
    try {
      await fetchWithAuth(`/accessories/${id}/adjustments`, {
        method: 'POST',
        body: JSON.stringify({ quantity_delta: parseFloat(adjForm.quantity_delta), reason: adjForm.reason }),
      });
      setMsg('Adjustment saved ✓');
      setAdjForm({ quantity_delta: '', reason: '' });
      load();
    } catch (err) { setMsg('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleEditColor = async () => {
    setSubmitting(true); setMsg('');
    try {
      await fetchWithAuth(`/accessories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(colorForm),
      });
      setIsEditingColor(false);
      setMsg('Color updated ✓');
      load();
    } catch (err) { setMsg('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this entry? This action cannot be undone and will delete all usage history and photos.')) return;
    setSubmitting(true);
    try {
      await fetchWithAuth(`/accessories/${id}`, { method: 'DELETE' });
      navigate('/accessories');
    } catch (err) {
      setMsg('Error: ' + err.message);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!entry) return <div className="empty-state"><p>Not found</p><button className="btn btn-secondary mt-4" onClick={() => navigate('/accessories')}>Back</button></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex gap-3 items-start mb-6 flex-wrap">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/accessories')}>← Accessories</button>
      </div>

      <div className="page-header flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="page-title">{entry.accessory_type_name}</h1>
          <div className="font-mono text-accent text-sm">{entry.lot_code}</div>
        </div>
        <span className={`status-badge status-${entry.status.toLowerCase()}`}>{entry.status}</span>
      </div>

      {/* Qty summary */}
      <div className="card mb-6" style={{ padding: 'var(--space-5)' }}>
        <div className="qty-display">
          <span className="qty-remaining" style={{ color: entry.remaining_quantity === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
            {entry.remaining_quantity}
          </span>
          <span className="qty-original">of {entry.original_quantity} {entry.unit_type} remaining</span>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '4px', height: '8px', marginTop: '12px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(entry.remaining_quantity / entry.original_quantity) * 100}%`,
            background: entry.remaining_quantity === 0 ? 'var(--status-used)' : 'var(--accent)',
            borderRadius: '4px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {msg && <div className={`toast mb-4 ${msg.startsWith('Error') ? 'toast-error' : 'toast-success'}`}>{msg}</div>}

      {/* Tabs */}
      <div className="tabs">
        {['details', 'log usage', 'history', ...(user?.role === 'admin' ? ['adjust'] : [])].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="detail-grid">
          <div>
            <div className="detail-field">
              <div className="detail-label flex items-center justify-between">
                <span>Color</span>
                {!isEditingColor && (
                  <button className="text-accent text-sm hover:underline" onClick={() => {
                    setColorForm({ color_name: entry.color_name, pantone_code: entry.pantone_code, pantone_name: entry.pantone_name, color_display: entry.color_display });
                    setIsEditingColor(true);
                  }}>
                    Edit Color
                  </button>
                )}
              </div>
              
              {isEditingColor ? (
                <div className="card mt-2" style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)', padding: 'var(--space-4)' }}>
                  <div className="flex gap-3 mb-4">
                    <button type="button" className={`filter-chip ${colorForm.color_name === 'N/A' ? 'active' : ''}`} onClick={() => setColorForm(f => ({ ...f, color_name: 'N/A', pantone_code: null, pantone_name: null, color_display: null }))}>
                      N/A (colourless)
                    </button>
                  </div>
                  {colorForm.color_name !== 'N/A' && (
                    <PantoneColorPicker
                      value={colorForm}
                      onChange={c => setColorForm(f => ({ ...f, ...c }))}
                    />
                  )}
                  <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingColor(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleEditColor} disabled={submitting}>Save</button>
                  </div>
                </div>
              ) : (
                <div className="detail-value flex items-center gap-2">
                  {entry.color_display && <span className="color-swatch" style={{ background: entry.color_display }} />}
                  {entry.pantone_name || entry.color_name}
                  {entry.pantone_code && <span className="text-muted text-xs">Pantone {entry.pantone_code} TCX</span>}
                </div>
              )}
            </div>
            {entry.size_spec && <div className="detail-field"><div className="detail-label">Size / Spec</div><div className="detail-value">{entry.size_spec}</div></div>}
            {entry.material && <div className="detail-field"><div className="detail-label">Material</div><div className="detail-value">{entry.material}</div></div>}
            {entry.brand_notes && <div className="detail-field"><div className="detail-label">Brand / Notes</div><div className="detail-value">{entry.brand_notes}</div></div>}
          </div>
          <div>
            {entry.vendor_name && <div className="detail-field"><div className="detail-label">Vendor</div><div className="detail-value">{entry.vendor_name}</div></div>}
            <div className="detail-field"><div className="detail-label">Condition</div><div className="detail-value">{entry.condition_name}</div></div>
            <div className="detail-field"><div className="detail-label">Location</div><div className="detail-value">{entry.storage_location_name || '—'}</div></div>
            <div className="detail-field"><div className="detail-label">Logged By</div><div className="detail-value">{entry.created_by_name} · {entry.created_at?.split('T')[0]}</div></div>
          </div>
          
          {/* Photos full width below */}
          <div style={{ gridColumn: '1 / -1' }}>
            <h3 className="mb-3 font-semibold mt-4">Photos</h3>
            {entry.photos?.length > 0 ? (
              <div className="photo-grid">
                {entry.photos.map(p => (
                  <a key={p.id} href={p.file_path.startsWith('http') ? p.file_path : `http://localhost:3001${p.file_path}`} target="_blank" rel="noreferrer" className="photo-thumb">
                    <img src={p.file_path.startsWith('http') ? p.file_path : `http://localhost:3001${p.file_path}`} alt="Accessory" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No photos available</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'log usage' && entry.status !== 'Disposed' && (
        <form onSubmit={logUsage} className="flex-col gap-4 max-w-xl">
          <div className="form-group">
            <label className="required">Quantity Used ({entry.unit_type})</label>
            <input type="number" step="any" min="0.01" max={entry.remaining_quantity} value={usageForm.quantity_used} onChange={e => setUsageForm(f => ({ ...f, quantity_used: e.target.value }))} required />
            <p className="text-xs text-muted mt-1">{entry.remaining_quantity} {entry.unit_type} available</p>
          </div>
          <div className="form-group">
            <label>Date Used</label>
            <input type="date" value={usageForm.date_used} onChange={e => setUsageForm(f => ({ ...f, date_used: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Used For (Order / Purpose)</label>
            <input type="text" placeholder="ORD-2026-001, sampling…" value={usageForm.used_for} onChange={e => setUsageForm(f => ({ ...f, used_for: e.target.value }))} />
          </div>
          <div className="form-group mb-0">
            <label>Notes</label>
            <textarea value={usageForm.notes} onChange={e => setUsageForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting || !usageForm.quantity_used}>
            {submitting ? <span className="spinner" /> : 'Log Usage'}
          </button>
        </form>
      )}

      {activeTab === 'history' && (
        <div>
          {entry.usage_history?.length > 0 ? (
            <div className="timeline">
              {entry.usage_history.map(u => (
                <div key={u.id} className="timeline-item">
                  <div className="timeline-dot usage" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-label usage">Used {u.quantity_used} {entry.unit_type}</span>
                      <span className="timeline-date">{u.date_used}</span>
                    </div>
                    <div className="timeline-body">{u.used_for || 'No purpose noted'} · by {u.logged_by_name}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty-state py-8"><p className="text-muted">No usage logged yet</p></div>}

          {entry.adjustment_history?.length > 0 && (
            <>
              <h4 className="font-semibold mt-6 mb-4">Adjustments</h4>
              <div className="timeline">
                {entry.adjustment_history.map(a => (
                  <div key={a.id} className="timeline-item">
                    <div className="timeline-dot adjustment" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-label adjustment">{a.quantity_delta > 0 ? '+' : ''}{a.quantity_delta} {entry.unit_type}</span>
                        <span className="timeline-date">{a.created_at?.split('T')[0]}</span>
                      </div>
                      <div className="timeline-body">{a.reason} · by {a.adjusted_by_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'adjust' && user?.role === 'admin' && (
        <form onSubmit={logAdjustment} className="flex-col gap-4 max-w-xl">
          <div className="card" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning)' }}>
            <p className="text-sm">⚠️ Adjustments are admin-only corrections. Use negative values to reduce stock.</p>
          </div>
          <div className="form-group">
            <label className="required">Quantity Delta (+ to add, − to remove)</label>
            <input type="number" step="any" placeholder="e.g. -10 or +50" value={adjForm.quantity_delta} onChange={e => setAdjForm(f => ({ ...f, quantity_delta: e.target.value }))} required />
          </div>
          <div className="form-group mb-0">
            <label className="required">Reason for Adjustment</label>
            <textarea value={adjForm.reason} onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-danger" disabled={submitting || !adjForm.quantity_delta || !adjForm.reason}>
            {submitting ? <span className="spinner" /> : 'Save Adjustment'}
          </button>
          
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <h4 className="font-semibold text-error mb-2">Danger Zone</h4>
            <p className="text-sm text-muted mb-4">Permanently delete this accessory entry and all its usage history.</p>
            <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)' }} onClick={handleDelete} disabled={submitting}>
              Delete Entry
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
