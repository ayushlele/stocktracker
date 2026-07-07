import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function StockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('details'); // details, usage, adjustments

  // Usage form state
  const [usageForm, setUsageForm] = useState({ quantity: '', reason: '' });
  const [loggingUsage, setLoggingUsage] = useState(false);
  const [usageError, setUsageError] = useState('');

  // Adjustment form state
  const [adjForm, setAdjForm] = useState({ delta: '', reason: '' });
  const [adjusting, setAdjusting] = useState(false);
  const [adjError, setAdjError] = useState('');
  
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEntry();
  }, [id]);

  const loadEntry = async () => {
    try {
      const data = await fetchWithAuth(`/stock/${id}`);
      setEntry(data);
    } catch (err) {
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleLogUsage = async (e) => {
    e.preventDefault();
    setUsageError('');
    setLoggingUsage(true);
    try {
      await fetchWithAuth(`/stock/${id}/usage`, {
        method: 'POST',
        body: JSON.stringify({
          quantity_used_meters: parseFloat(usageForm.quantity),
          used_for: usageForm.reason
        })
      });
      setUsageForm({ quantity: '', reason: '' });
      await loadEntry(); // Reload to get updated quantities and history
    } catch (err) {
      setUsageError(err.message || 'Failed to log usage');
    } finally {
      setLoggingUsage(false);
    }
  };

  const handleAdjustment = async (e) => {
    e.preventDefault();
    setAdjError('');
    setAdjusting(true);
    try {
      await fetchWithAuth(`/stock/${id}/adjustments`, {
        method: 'POST',
        body: JSON.stringify({
          quantity_delta: parseFloat(adjForm.delta),
          reason: adjForm.reason
        })
      });
      setAdjForm({ delta: '', reason: '' });
      await loadEntry();
    } catch (err) {
      setAdjError(err.message || 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this fabric entry? This action cannot be undone and will delete all usage history and photos.')) return;
    setDeleting(true);
    try {
      await fetchWithAuth(`/stock/${id}`, { method: 'DELETE' });
      navigate('/stock');
    } catch (err) {
      setAdjError('Failed to delete: ' + err.message);
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
  if (error) return <div className="empty-state text-error">{error}</div>;
  if (!entry) return null;

  return (
    <div className="max-w-xl mx-auto pb-8">
      <div className="page-header flex justify-between items-start mb-4">
        <div>
          <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(-1)} style={{ padding: 0 }}>
             ← Back
          </button>
          <h1 className="page-title flex items-center gap-3">
            {entry.fabric_type_name}
            <span className={`status-badge status-${entry.status.toLowerCase()}`}>{entry.status}</span>
          </h1>
          <p className="font-mono text-accent">{entry.lot_code}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Details & Photos</button>
        <button className={`tab ${activeTab === 'usage' ? 'active' : ''}`} onClick={() => setActiveTab('usage')}>Usage History</button>
        <button className={`tab ${activeTab === 'adjustments' ? 'active' : ''}`} onClick={() => setActiveTab('adjustments')}>Adjustments</button>
      </div>

      {/* ── Details Tab ──────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="flex-col gap-4">
          <div className="card">
            <div className="detail-grid">
              <div className="detail-field">
                <div className="detail-label">Quantity</div>
                <div className="qty-display">
                  <span className="qty-remaining">{entry.remaining_quantity_meters}m</span>
                  <span className="qty-original">/ {entry.original_quantity_meters}m original</span>
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Color</div>
                <div className="detail-value flex items-center gap-2">
                  {entry.color_display && <span className="color-swatch" style={{ background: entry.color_display }} />}
                  {entry.pantone_name || entry.color_name}
                  {entry.pantone_code && <span className="text-muted text-xs">Pantone {entry.pantone_code} TCX</span>}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Condition</div>
                <div className="detail-value">{entry.condition_name}</div>
                {entry.condition_notes && <div className="text-sm text-muted mt-1">{entry.condition_notes}</div>}
              </div>
              <div className="detail-field">
                <div className="detail-label">Storage Location</div>
                <div className="detail-value">{entry.storage_location_name || entry.storage_location_other_text || '—'}</div>
              </div>
              {entry.vendor_name && (
                <div className="detail-field">
                  <div className="detail-label">Vendor</div>
                  <div className="detail-value">{entry.vendor_name}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Design & Origins</h3>
            <div className="detail-grid">
              <div className="detail-field">
                <div className="detail-label">Embroidery</div>
                <div className="detail-value">{entry.has_embroidery ? entry.embroidery_type_name : 'None'}</div>
                {entry.embroidery_description && <div className="text-sm text-muted mt-1">{entry.embroidery_description}</div>}
              </div>
              <div className="detail-field">
                <div className="detail-label">Printing</div>
                <div className="detail-value">{entry.has_printing ? entry.printing_type_name : 'None'}</div>
                {entry.printing_description && <div className="text-sm text-muted mt-1">{entry.printing_description}</div>}
              </div>
              <div className="detail-field">
                <div className="detail-label">Leftover Reason</div>
                <div className="detail-value">{entry.reason_name}</div>
                {entry.reason_other_text && <div className="text-sm text-muted mt-1">{entry.reason_other_text}</div>}
              </div>
              <div className="detail-field">
                <div className="detail-label">Linked Order</div>
                {entry.order ? (
                  <div>
                    <div className="detail-value">{entry.order.order_number}</div>
                    <div className="text-sm text-muted">{entry.order.style_name}</div>
                  </div>
                ) : <div className="detail-value text-muted">None</div>}
              </div>
            </div>
          </div>

          {entry.photos?.length > 0 && (
            <div className="card">
              <h3 className="card-title mb-4">Photos</h3>
              <div className="photo-grid">
                {entry.photos.map(p => (
                  <a key={p.id} href={p.file_path.startsWith('http') ? p.file_path : `http://localhost:3001${p.file_path}`} target="_blank" rel="noreferrer" className="photo-thumb">
                    <img src={p.file_path.startsWith('http') ? p.file_path : `http://localhost:3001${p.file_path}`} alt="Fabric" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Usage Tab ────────────────────────────────────────── */}
      {activeTab === 'usage' && (
        <div className="flex-col gap-4">
          {entry.status !== 'Disposed' && entry.remaining_quantity_meters > 0 && (
            <div className="card" style={{ borderColor: 'var(--info)' }}>
              <h3 className="card-title text-info mb-4">Log Usage</h3>
              <form onSubmit={handleLogUsage} className="flex-col gap-4">
                <div className="form-row">
                  <div className="form-group mb-0">
                    <label className="required">Meters Used</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max={entry.remaining_quantity_meters}
                      required
                      value={usageForm.quantity}
                      onChange={e => setUsageForm({ ...usageForm, quantity: e.target.value })}
                      placeholder={`Max ${entry.remaining_quantity_meters}`}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label>Used For (Order / Purpose)</label>
                    <input
                      type="text"
                      value={usageForm.reason}
                      onChange={e => setUsageForm({ ...usageForm, reason: e.target.value })}
                      placeholder="e.g. ORD-123 patch pieces"
                    />
                  </div>
                </div>
                {usageError && <div className="text-error text-sm">{usageError}</div>}
                <button type="submit" className="btn btn-primary" disabled={loggingUsage} style={{ background: 'var(--info)' }}>
                  {loggingUsage ? 'Logging...' : 'Log Usage'}
                </button>
              </form>
            </div>
          )}

          <div className="card mt-6">
            <h3 className="card-title mb-4">History</h3>
            {entry.usage_history?.length > 0 ? (
              <div className="timeline">
                {entry.usage_history.map(u => (
                  <div key={u.id} className="timeline-item">
                    <div className="timeline-dot usage"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-label usage">Used {u.quantity_used_meters}m</span>
                        <span className="timeline-date">{new Date(u.date_used).toLocaleDateString()}</span>
                      </div>
                      <div className="timeline-body">
                        {u.used_for && <div><strong>For:</strong> {u.used_for}</div>}
                        {u.notes && <div className="text-muted mt-1">{u.notes}</div>}
                        <div className="text-xs text-muted mt-2">Logged by {u.logged_by_name}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted text-center py-4">No usage logged yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Adjustments Tab ──────────────────────────────────── */}
      {activeTab === 'adjustments' && (
        <div className="flex-col gap-4">
          {user?.role === 'admin' && entry.status !== 'Disposed' && (
             <div className="card" style={{ borderColor: 'var(--warning)' }}>
              <h3 className="card-title text-warning mb-4">Adjust Stock Balance</h3>
              <p className="text-sm text-muted mb-4">
                Use this to correct data entry errors or physical stock counts. 
                For normal consumption, use the Usage tab instead.
              </p>
              <form onSubmit={handleAdjustment} className="flex-col gap-4">
                <div className="form-group">
                  <label className="required">Quantity Delta (+ or -)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={adjForm.delta}
                    onChange={e => setAdjForm({ ...adjForm, delta: e.target.value })}
                    placeholder="e.g. -5 or +2.5"
                  />
                </div>
                <div className="form-group">
                  <label className="required">Reason for Adjustment</label>
                  <textarea
                    required
                    value={adjForm.reason}
                    onChange={e => setAdjForm({ ...adjForm, reason: e.target.value })}
                    placeholder="e.g. Physical count mismatch"
                  />
                </div>
                {adjError && <div className="text-error text-sm">{adjError}</div>}
                <button type="submit" className="btn btn-primary" disabled={adjusting} style={{ background: 'var(--warning)' }}>
                  {adjusting ? 'Adjusting...' : 'Submit Adjustment'}
                </button>
              </form>
              <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                <h4 className="font-semibold text-error mb-2">Danger Zone</h4>
                <p className="text-sm text-muted mb-4">Permanently delete this fabric entry and all its usage history.</p>
                <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)' }} onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Entry'}
                </button>
              </div>
            </div>
          )}

          <div className="card mt-6">
            <h3 className="card-title mb-4">Adjustment History</h3>
            {entry.adjustment_history?.length > 0 ? (
              <div className="timeline">
                {entry.adjustment_history.map(a => (
                  <div key={a.id} className="timeline-item">
                    <div className="timeline-dot adjustment"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-label adjustment">
                          {a.quantity_delta > 0 ? '+' : ''}{a.quantity_delta}m
                        </span>
                        <span className="timeline-date">{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="timeline-body">
                        <div>{a.reason}</div>
                        <div className="text-xs text-muted mt-2">Adjusted by {a.adjusted_by_name}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted text-center py-4">No adjustments recorded.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
