import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';
import { InlineAddSelect, useReferenceData } from '../../components/FormElements';
import PantoneColorPicker from '../../components/PantoneColorPicker';

function MasterForm({ initial = {}, onSave, onCancel }) {
  const { data: fabricTypes, addItem: addFabric } = useReferenceData('/fabric-types', { activeOnly: true });
  const { data: embTypes, addItem: addEmb } = useReferenceData('/embroidery-types', { activeOnly: true });
  const { data: printTypes, addItem: addPrint } = useReferenceData('/printing-types', { activeOnly: true });
  const { data: reasons } = useReferenceData('/reason-options', { activeOnly: true });
  const { data: vendors, addItem: addVendor } = useReferenceData('/vendors', { activeOnly: true });

  const [f, setF] = useState({
    name: initial.name || '',
    fabric_type_id: initial.fabric_type_id || null,
    has_embroidery: !!initial.has_embroidery,
    embroidery_type_id: initial.embroidery_type_id || null,
    embroidery_description: initial.embroidery_description || '',
    has_printing: !!initial.has_printing,
    printing_type_id: initial.printing_type_id || null,
    printing_description: initial.printing_description || '',
    other_design_notes: initial.other_design_notes || '',
    default_reason_id: initial.default_reason_id || null,
    vendor_id: initial.vendor_id || null,
    is_active: initial.is_active !== undefined ? !!initial.is_active : true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!f.name.trim() || !f.fabric_type_id) { setErr('Name and fabric type are required'); return; }
    setSaving(true); setErr('');
    try { await onSave(f); } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="card flex-col gap-4 mt-4" style={{ borderColor: 'var(--accent)' }}>
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{initial.id ? 'Edit Master' : 'New Master'}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
      </div>
      {err && <div className="toast toast-error">{err}</div>}

      <div className="form-group">
        <label className="required">Master Name</label>
        <input type="text" placeholder="e.g. Printed Red Linen, Plain White Cotton" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
      </div>

      <InlineAddSelect label="Fabric Type *" options={fabricTypes} value={f.fabric_type_id} onSelect={id => setF(p => ({ ...p, fabric_type_id: id }))} onAdd={addFabric} required />

      <div className="form-row">
        <div>
          <label>Embroidery?</label>
          <div className="toggle-group">
            <div className={`toggle-option ${!f.has_embroidery ? 'active' : ''}`} onClick={() => setF(p => ({ ...p, has_embroidery: false, embroidery_type_id: null }))}>No</div>
            <div className={`toggle-option ${f.has_embroidery ? 'active' : ''}`} onClick={() => setF(p => ({ ...p, has_embroidery: true }))}>Yes</div>
          </div>
          {f.has_embroidery && (
            <div className="mt-3">
              <InlineAddSelect options={embTypes} value={f.embroidery_type_id} onSelect={id => setF(p => ({ ...p, embroidery_type_id: id }))} onAdd={addEmb} />
              <input type="text" className="mt-2" placeholder="Embroidery description" value={f.embroidery_description} onChange={e => setF(p => ({ ...p, embroidery_description: e.target.value }))} />
            </div>
          )}
        </div>
        <div>
          <label>Printing?</label>
          <div className="toggle-group">
            <div className={`toggle-option ${!f.has_printing ? 'active' : ''}`} onClick={() => setF(p => ({ ...p, has_printing: false, printing_type_id: null }))}>No</div>
            <div className={`toggle-option ${f.has_printing ? 'active' : ''}`} onClick={() => setF(p => ({ ...p, has_printing: true }))}>Yes</div>
          </div>
          {f.has_printing && (
            <div className="mt-3">
              <InlineAddSelect options={printTypes} value={f.printing_type_id} onSelect={id => setF(p => ({ ...p, printing_type_id: id }))} onAdd={addPrint} />
              <input type="text" className="mt-2" placeholder="Printing description" value={f.printing_description} onChange={e => setF(p => ({ ...p, printing_description: e.target.value }))} />
            </div>
          )}
        </div>
      </div>

      <div className="form-row">
        <InlineAddSelect label="Default Vendor" options={vendors} value={f.vendor_id} onSelect={id => setF(p => ({ ...p, vendor_id: id }))} onAdd={addVendor} allowNone noneLabel="None" />
        <div>
          <label>Default Reason</label>
          <select value={f.default_reason_id || ''} onChange={e => setF(p => ({ ...p, default_reason_id: e.target.value ? parseInt(e.target.value) : null }))}>
            <option value="">None</option>
            {reasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group mb-0">
        <label>Other Design Notes</label>
        <input type="text" placeholder="Any default notes" value={f.other_design_notes} onChange={e => setF(p => ({ ...p, other_design_notes: e.target.value }))} />
      </div>

      <div className="flex gap-3 mt-2">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <span className="spinner" /> : 'Save Master'}</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function Masters() {
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = () => {
    setLoading(true);
    fetchWithAuth('/masters').then(d => { setMasters(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSaveNew = async (f) => {
    await fetchWithAuth('/masters', { method: 'POST', body: JSON.stringify(f) });
    setShowForm(false);
    load();
  };

  const handleSaveEdit = async (f) => {
    await fetchWithAuth(`/masters/${editingMaster.id}`, { method: 'PUT', body: JSON.stringify(f) });
    setEditingMaster(null);
    load();
  };

  const handleToggleActive = async (m) => {
    await fetchWithAuth(`/masters/${m.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !m.is_active }) });
    load();
  };

  const visible = showInactive ? masters : masters.filter(m => m.is_active);

  return (
    <div>
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">📋 Masters</h1>
          <p className="page-subtitle">Templates for quick fabric stock entry</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingMaster(null); }}>+ New Master</button>
      </div>

      {showForm && !editingMaster && <MasterForm onSave={handleSaveNew} onCancel={() => setShowForm(false)} />}

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
          ? <div className="empty-state"><div className="empty-state-icon">📋</div><p>No masters yet — create your first one above</p></div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {visible.map(m => (
                <div key={m.id} className={`master-card ${!m.is_active ? 'ref-list-item inactive' : ''}`}>
                  {editingMaster?.id === m.id
                    ? <MasterForm initial={m} onSave={handleSaveEdit} onCancel={() => setEditingMaster(null)} />
                    : <>
                        <div className="master-card-name">{m.name}</div>
                        <div className="master-card-tags">
                          <span className="master-tag">{m.fabric_type_name}</span>
                          {m.has_embroidery ? <span className="master-tag" style={{ color: 'var(--info)' }}>Emb: {m.embroidery_type_name || '?'}</span> : null}
                          {m.has_printing ? <span className="master-tag" style={{ color: 'var(--success)' }}>Print: {m.printing_type_name || '?'}</span> : null}
                          {m.vendor_name ? <span className="master-tag">📦 {m.vendor_name}</span> : null}
                          {m.default_reason_name ? <span className="master-tag">💬 {m.default_reason_name.split(' ').slice(0,2).join(' ')}</span> : null}
                        </div>
                        {m.other_design_notes && <div className="text-xs text-muted mt-2">{m.other_design_notes}</div>}
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
