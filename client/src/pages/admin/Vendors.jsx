import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';

function VendorForm({ initial = {}, onSave, onCancel }) {
  const [f, setF] = useState({
    name: initial.name || '',
    contact_person: initial.contact_person || '',
    phone: initial.phone || '',
    notes: initial.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!f.name.trim()) { setErr('Name is required'); return; }
    setSaving(true); setErr('');
    try { await onSave(f); } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="card flex-col gap-3 mt-3" style={{ borderColor: 'var(--accent)' }}>
      {err && <div className="toast toast-error">{err}</div>}
      <div className="form-row">
        <div className="form-group mb-0">
          <label className="required">Vendor Name</label>
          <input type="text" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Khatri Textiles" />
        </div>
        <div className="form-group mb-0">
          <label>Contact Person</label>
          <input type="text" value={f.contact_person} onChange={e => setF(p => ({ ...p, contact_person: e.target.value }))} placeholder="Name" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group mb-0">
          <label>Phone</label>
          <input type="text" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765…" />
        </div>
        <div className="form-group mb-0">
          <label>Notes</label>
          <input type="text" value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} placeholder="Min order, lead time…" />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <span className="spinner" /> : 'Save'}</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    fetchWithAuth('/vendors').then(d => { setVendors(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSaveNew = async (f) => {
    await fetchWithAuth('/vendors', { method: 'POST', body: JSON.stringify(f) });
    setShowForm(false);
    load();
  };

  const handleSaveEdit = async (f) => {
    await fetchWithAuth(`/vendors/${editingId}`, { method: 'PUT', body: JSON.stringify(f) });
    setEditingId(null);
    load();
  };

  const toggleActive = async (v) => {
    await fetchWithAuth(`/vendors/${v.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !v.is_active }) });
    load();
  };

  const filtered = vendors.filter(v => {
    if (!showInactive && !v.is_active) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">🏭 Vendors</h1>
          <p className="page-subtitle">Manage fabric and accessory suppliers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); }}>+ Add Vendor</button>
      </div>

      {showForm && !editingId && <VendorForm onSave={handleSaveNew} onCancel={() => setShowForm(false)} />}

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input type="search" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '280px' }} />
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="switch">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            <span className="switch-slider" />
          </span>
          Show inactive
        </label>
      </div>

      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">🏭</div><p>No vendors found</p></div>
          : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {filtered.map((v, idx) => (
                <div key={v.id}>
                  {editingId === v.id
                    ? <div style={{ padding: 'var(--space-4)' }}><VendorForm initial={v} onSave={handleSaveEdit} onCancel={() => setEditingId(null)} /></div>
                    : (
                      <div className="ref-list-item" style={{ opacity: v.is_active ? 1 : 0.5 }}>
                        <div style={{ flex: 1 }}>
                          <div className="font-semibold">{v.name}</div>
                          <div className="text-sm text-muted flex gap-3 flex-wrap mt-1">
                            {v.contact_person && <span>👤 {v.contact_person}</span>}
                            {v.phone && <span>📞 {v.phone}</span>}
                            {v.notes && <span>💬 {v.notes}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(v.id)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: v.is_active ? 'var(--error)' : 'var(--success)' }} onClick={() => toggleActive(v)}>
                            {v.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    )
                  }
                  {idx < filtered.length - 1 && <div className="sidebar-divider" style={{ margin: 0 }} />}
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}
