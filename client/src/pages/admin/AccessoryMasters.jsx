import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';
import { InlineAddSelect, useReferenceData } from '../../components/FormElements';

function AccessoryMasterForm({ initial = {}, onSave, onCancel }) {
  const { data: accessoryTypes, addItem: addAccessoryType } = useReferenceData('/accessory-types', { activeOnly: true });
  const { data: reasons } = useReferenceData('/reason-options', { activeOnly: true });
  const { data: vendors, addItem: addVendor } = useReferenceData('/vendors', { activeOnly: true });

  const [f, setF] = useState({
    name: initial.name || '',
    accessory_type_id: initial.accessory_type_id || null,
    default_material: initial.default_material || '',
    default_size_spec: initial.default_size_spec || '',
    brand_notes: initial.brand_notes || '',
    default_unit_type: initial.default_unit_type || 'pieces',
    default_reason_id: initial.default_reason_id || null,
    vendor_id: initial.vendor_id || null,
    is_active: initial.is_active !== undefined ? !!initial.is_active : true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!f.name.trim() || !f.accessory_type_id) { setErr('Name and accessory type are required'); return; }
    setSaving(true); setErr('');
    try { await onSave(f); } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="card flex-col gap-4 mt-4" style={{ borderColor: 'var(--accent)' }}>
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{initial.id ? 'Edit Accessory Master' : 'New Accessory Master'}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
      </div>
      {err && <div className="toast toast-error">{err}</div>}

      <div className="form-group">
        <label className="required">Master Name</label>
        <input type="text" placeholder="e.g. YKK 20cm Black Zipper, 15mm White Button" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
      </div>

      <InlineAddSelect label="Accessory Type *" options={accessoryTypes} value={f.accessory_type_id} onSelect={id => {
        setF(p => ({ ...p, accessory_type_id: id }));
        const t = accessoryTypes.find(a => a.id === id);
        if (t && t.default_unit) setF(p => ({ ...p, default_unit_type: t.default_unit }));
      }} onAdd={addAccessoryType} required />

      <div className="form-row">
        <div className="form-group mb-0">
          <label>Default Material</label>
          <input type="text" placeholder="e.g. Plastic, Nylon, Metal" value={f.default_material} onChange={e => setF(p => ({ ...p, default_material: e.target.value }))} />
        </div>
        <div className="form-group mb-0">
          <label>Default Size / Spec</label>
          <input type="text" placeholder="e.g. 15mm, 20cm #3" value={f.default_size_spec} onChange={e => setF(p => ({ ...p, default_size_spec: e.target.value }))} />
        </div>
      </div>

      <div className="form-group">
        <label>Brand Notes</label>
        <input type="text" placeholder="e.g. YKK, Kairo Logo engraved" value={f.brand_notes} onChange={e => setF(p => ({ ...p, brand_notes: e.target.value }))} />
      </div>

      <div className="form-row">
        <div>
          <label>Default Unit Type</label>
          <select value={f.default_unit_type} onChange={e => setF(p => ({ ...p, default_unit_type: e.target.value }))}>
            <option value="pieces">Pieces</option>
            <option value="meters">Meters</option>
            <option value="cones">Cones</option>
          </select>
        </div>
        <InlineAddSelect label="Default Vendor" options={vendors} value={f.vendor_id} onSelect={id => setF(p => ({ ...p, vendor_id: id }))} onAdd={addVendor} allowNone noneLabel="None" />
      </div>

      <div className="form-group mb-0">
        <label>Default Reason</label>
        <select value={f.default_reason_id || ''} onChange={e => setF(p => ({ ...p, default_reason_id: e.target.value ? parseInt(e.target.value) : null }))}>
          <option value="">None</option>
          {reasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="flex gap-3 mt-2">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <span className="spinner" /> : 'Save Master'}</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function AccessoryMasters() {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = () => {
    setLoading(true);
    fetchWithAuth('/accessory-masters').then(d => { setMasters(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSaveNew = async (f) => {
    await fetchWithAuth('/accessory-masters', { method: 'POST', body: JSON.stringify(f) });
    setShowForm(false);
    load();
  };

  const handleSaveEdit = async (f) => {
    await fetchWithAuth(`/accessory-masters/${editingMaster.id}`, { method: 'PUT', body: JSON.stringify(f) });
    setEditingMaster(null);
    load();
  };

  const handleToggleActive = async (m) => {
    await fetchWithAuth(`/accessory-masters/${m.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !m.is_active }) });
    load();
  };

  const visible = showInactive ? masters : masters.filter(m => m.is_active);

  return (
    <div>
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">🔘 Accessory Masters</h1>
          <p className="page-subtitle">Templates for quick accessory stock entry</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingMaster(null); }}>+ New Master</button>
      </div>

      {showForm && !editingMaster && <AccessoryMasterForm onSave={handleSaveNew} onCancel={() => setShowForm(false)} />}

      <div className="flex items-center gap-3 mb-4 mt-4">
        <label className="switch">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          <span className="switch-slider" />
        </label>
        <span className="text-sm text-muted">Show inactive</span>
      </div>

      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : visible.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">🔘</div><p>No accessory masters yet — create your first one above</p></div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {visible.map(m => (
                <div key={m.id} className={`master-card ${!m.is_active ? 'ref-list-item inactive' : ''}`}>
                  {editingMaster?.id === m.id
                    ? <AccessoryMasterForm initial={m} onSave={handleSaveEdit} onCancel={() => setEditingMaster(null)} />
                    : <>
                        <div className="master-card-name">{m.name}</div>
                        <div className="master-card-tags">
                          <span className="master-tag">{m.accessory_type_name}</span>
                          {m.default_material ? <span className="master-tag" style={{ color: 'var(--info)' }}>{m.default_material}</span> : null}
                          {m.default_size_spec ? <span className="master-tag" style={{ color: 'var(--success)' }}>{m.default_size_spec}</span> : null}
                          {m.vendor_name ? <span className="master-tag">📦 {m.vendor_name}</span> : null}
                          {m.default_reason_name ? <span className="master-tag">💬 {m.default_reason_name.split(' ').slice(0,2).join(' ')}</span> : null}
                        </div>
                        {m.brand_notes && <div className="text-xs text-muted mt-2">{m.brand_notes}</div>}
                        <div className="text-xs text-muted mt-1">Default Unit: {m.default_unit_type}</div>
                        <div className="flex gap-2 mt-4">
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingMaster(m)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(m)} style={{ color: m.is_active ? 'var(--error)' : 'var(--success)' }}>
                            {m.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </>
                  }
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}
