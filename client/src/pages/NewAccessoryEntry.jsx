import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { InlineAddSelect, useReferenceData } from '../components/FormElements';
import PantoneColorPicker from '../components/PantoneColorPicker';

export default function NewAccessoryEntry() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null=choose, 'quick'=master, 'full'=wizard
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Masters
  const [masters, setMasters] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);

  const { data: accTypes, addItem: addAccType } = useReferenceData('/accessory-types', { activeOnly: true });
  const { data: conditions } = useReferenceData('/condition-options', { activeOnly: true });
  const { data: reasons } = useReferenceData('/reason-options', { activeOnly: true });
  const { data: locations, addItem: addLocation } = useReferenceData('/storage-locations', { activeOnly: true });
  const { data: vendors, addItem: addVendor } = useReferenceData('/vendors', { activeOnly: true });

  useEffect(() => {
    fetchWithAuth('/accessory-masters?active_only=true').then(setMasters).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    accessory_type_id: null,
    color_name: '', pantone_code: null, pantone_name: null, color_display: null,
    size_spec: '', material: '', brand_notes: '',
    vendor_id: null, order_id: null,
    unit_type: 'pieces',
    original_quantity: '',
    condition_id: null, condition_notes: '',
    reason_id: null, reason_other_text: '',
    storage_location_id: null,
    photos: [],
    master_id: null,
  });

  const selectedCondition = conditions.find(c => c.id === form.condition_id);
  const selectedReason = reasons.find(r => r.id === form.reason_id);
  const accConditions = conditions.filter(c => !c.item_type || c.item_type === 'both' || c.item_type === 'accessory');

  const selectedType = accTypes.find(t => t.id === form.accessory_type_id);

  // When type changes, auto-set unit from default_unit
  const selectType = (id) => {
    const t = accTypes.find(x => x.id === id);
    setForm(f => ({ ...f, accessory_type_id: id, unit_type: t?.default_unit || 'pieces' }));
  };

  const applyMaster = (master) => {
    setSelectedMaster(master);
    setForm(f => ({
      ...f,
      accessory_type_id: master.accessory_type_id,
      material: master.default_material || '',
      size_spec: master.default_size_spec || '',
      brand_notes: master.brand_notes || '',
      unit_type: master.default_unit_type || 'pieces',
      vendor_id: master.vendor_id,
      reason_id: master.default_reason_id,
      master_id: master.id,
    }));
    setMode('quick');
    setStep(1);
  };

  const FULL_STEPS = 6;
  const QUICK_STEPS = 5;
  const totalSteps = mode === 'quick' ? QUICK_STEPS : FULL_STEPS;

  const canGoNext = () => {
    if (mode === 'quick') {
      switch (step) {
        case 1: return !!form.color_name.trim();
        case 2: return parseFloat(form.original_quantity) > 0;
        case 3: return !!form.condition_id && (!selectedCondition?.is_other || !!form.condition_notes.trim());
        case 4: return !!form.storage_location_id;
        case 5: return form.photos.length > 0;
        default: return true;
      }
    }
    switch (step) {
      case 1: return !!form.accessory_type_id;
      case 2: return !!form.color_name.trim();
      case 3: return true; // specs optional
      case 4: 
        return parseFloat(form.original_quantity) > 0 && 
               !!form.condition_id && (!selectedCondition?.is_other || !!form.condition_notes.trim()) &&
               !!form.reason_id && (!selectedReason?.is_other || !!form.reason_other_text.trim()) && 
               !!form.storage_location_id;
      case 5: return form.photos.length > 0;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const payload = { ...form };
      delete payload.photos;
      const entry = await fetchWithAuth('/accessories', { method: 'POST', body: JSON.stringify(payload) });
      
      if (form.photos.length > 0) {
        const fd = new FormData();
        form.photos.forEach(f => fd.append('photos', f));
        await fetchWithAuth(`/accessories/${entry.id}/photos`, { method: 'POST', body: fd });
      }
      
      navigate(`/accessories/${entry.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (form.photos.length + newFiles.length > 6) { alert('Max 6 photos'); return; }
    setForm(f => ({ ...f, photos: [...f.photos, ...newFiles] }));
  };

  // ── Mode Selection Screen ────────────────────────────────────
  if (!mode) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="page-header">
          <h1 className="page-title">New Accessory</h1>
          <p className="page-subtitle">How would you like to log this?</p>
        </div>

        {masters.length > 0 ? (
          <>
            <h3 className="font-semibold mb-4">⚡ Quick Add from Master</h3>
            <p className="text-sm text-muted mb-4">Pick a template — you only fill in color, quantity, and condition.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {masters.map(m => (
                <div key={m.id} className="master-card" onClick={() => applyMaster(m)}>
                  <div className="master-card-name">{m.name}</div>
                  <div className="master-card-tags">
                    {m.accessory_type_name && <span className="master-tag">{m.accessory_type_name}</span>}
                    {m.default_material && <span className="master-tag" style={{ color: 'var(--info)' }}>{m.default_material}</span>}
                    {m.default_size_spec && <span className="master-tag" style={{ color: 'var(--success)' }}>{m.default_size_spec}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="sidebar-divider mb-6" />
          </>
        ) : (
          <>
            <div className="card flex items-center justify-between gap-4 mb-6" style={{ borderColor: 'var(--border-color)', borderStyle: 'dashed' }}>
              <div className="flex items-center gap-4">
                <div style={{ fontSize: '1.5rem', background: 'var(--bg-elevated)', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0 }}>
                  🔘
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Want to speed this up?</h3>
                  <p className="text-sm text-muted m-0">Create a Master template for accessories you stock often to skip the repetitive steps.</p>
                </div>
              </div>
              <button className="btn btn-outline whitespace-nowrap" onClick={() => navigate('/admin/accessory-masters')}>
                + Create Master
              </button>
            </div>
            <div className="sidebar-divider mb-6" />
          </>
        )}

        <button className="btn btn-secondary btn-full" onClick={() => { setMode('full'); setStep(1); }}>
          📋 Full Entry Wizard (6 steps)
        </button>
      </div>
    );
  }

  // ── Quick Mode Steps ─────────────────────────────────────────
  const renderQuickStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex-col gap-4">
            <h3>What color is this {selectedMaster?.name}?</h3>
            <div className="flex gap-3 mb-2">
              <button
                type="button"
                className={`filter-chip ${form.color_name === 'N/A' ? 'active' : ''}`}
                onClick={() => setForm(f => {
                  if (f.color_name === 'N/A') return { ...f, color_name: '', pantone_code: null, pantone_name: null, color_display: null };
                  return { ...f, color_name: 'N/A', pantone_code: null, pantone_name: null, color_display: null };
                })}
              >
                N/A (colourless)
              </button>
            </div>
            {form.color_name !== 'N/A' && (
              <PantoneColorPicker
                value={{ color_name: form.color_name, pantone_code: form.pantone_code, pantone_name: form.pantone_name, color_display: form.color_display }}
                onChange={c => setForm(f => ({ ...f, ...c }))}
              />
            )}
          </div>
        );
      case 2:
        return (
          <div className="flex-col gap-4">
            <h3>How many {form.unit_type}?</h3>
            <div className="form-group">
              <label className="required">Quantity</label>
              <input type="number" step="1" min="1" placeholder={`e.g. 500`} value={form.original_quantity} onChange={e => setForm(f => ({ ...f, original_quantity: e.target.value }))} />
            </div>
            <InlineAddSelect label="Vendor" options={vendors} value={form.vendor_id} onSelect={id => setForm(f => ({ ...f, vendor_id: id }))} onAdd={addVendor} allowNone noneLabel="Unknown" />
          </div>
        );
      case 3:
        return (
          <div className="flex-col gap-4">
            <h3>Condition?</h3>
            <div className="flex-col gap-2">
              {accConditions.map(c => (
                <label key={c.id} className="card flex items-center gap-3" style={{ padding: 'var(--space-3)', margin: 0, cursor: 'pointer', borderColor: form.condition_id === c.id ? 'var(--accent)' : '' }}>
                  <input type="radio" name="cond" checked={form.condition_id === c.id} onChange={() => setForm(f => ({ ...f, condition_id: c.id, condition_notes: '' }))} style={{ width: 'auto' }} />
                  {c.name}
                </label>
              ))}
            </div>
            {selectedCondition?.is_other && (
              <div className="mt-2">
                <label className="required text-sm">Describe condition</label>
                <textarea value={form.condition_notes} onChange={e => setForm(f => ({ ...f, condition_notes: e.target.value }))} rows="2" />
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="flex-col gap-4">
            <h3>Where is it stored?</h3>
            <InlineAddSelect label="Storage Location *" options={locations} value={form.storage_location_id} onSelect={id => setForm(f => ({ ...f, storage_location_id: id }))} onAdd={addLocation} required />
          </div>
        );
      case 5:
        return renderPhotoStep();
      case 6:
        return renderReview();
      default: return null;
    }
  };

  // ── Full Mode Steps ─────────────────────────────────────────
  const renderFullStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex-col gap-4">
            <h3>What type of accessory?</h3>
            <InlineAddSelect
              label="Accessory Type *"
              options={accTypes}
              value={form.accessory_type_id}
              onSelect={selectType}
              onAdd={addAccType}
              required
            />
            {selectedType && (
              <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)' }}>
                <div className="font-semibold">{selectedType.name}</div>
                <div className="text-sm text-muted mt-1">Unit: {selectedType.default_unit}</div>
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="flex-col gap-4">
            <h3>Color</h3>
            <div className="flex gap-3 mb-2">
              <button
                type="button"
                className={`filter-chip ${form.color_name === 'N/A' ? 'active' : ''}`}
                onClick={() => setForm(f => {
                  if (f.color_name === 'N/A') return { ...f, color_name: '', pantone_code: null, pantone_name: null, color_display: null };
                  return { ...f, color_name: 'N/A', pantone_code: null, pantone_name: null, color_display: null };
                })}
              >
                N/A (colourless)
              </button>
            </div>
            {form.color_name !== 'N/A' && (
              <PantoneColorPicker
                value={{ color_name: form.color_name, pantone_code: form.pantone_code, pantone_name: form.pantone_name, color_display: form.color_display }}
                onChange={c => setForm(f => ({ ...f, ...c }))}
              />
            )}
          </div>
        );
      case 3:
        return (
          <div className="flex-col gap-4">
            <h3>Specifications</h3>
            <div className="form-row">
              <div className="form-group mb-0">
                <label>Size / Spec</label>
                <input type="text" placeholder="e.g. 15mm, 20cm, YKK #5" value={form.size_spec} onChange={e => setForm(f => ({ ...f, size_spec: e.target.value }))} />
              </div>
              <div className="form-group mb-0">
                <label>Material</label>
                <input type="text" placeholder="e.g. Plastic, Metal, Nylon" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} />
              </div>
            </div>
            <div className="form-group mb-0">
              <label>Brand / Additional Notes</label>
              <input type="text" placeholder="e.g. YKK, Coats, custom spec…" value={form.brand_notes} onChange={e => setForm(f => ({ ...f, brand_notes: e.target.value }))} />
            </div>
            <InlineAddSelect label="Vendor" options={vendors} value={form.vendor_id} onSelect={id => setForm(f => ({ ...f, vendor_id: id }))} onAdd={addVendor} allowNone noneLabel="Unknown" />
          </div>
        );
      case 4:
        return (
          <div className="flex-col gap-4">
            <h3>Quantity, Condition & Location</h3>
            <div className="form-row">
              <div className="form-group mb-0">
                <label className="required">Quantity</label>
                <input type="number" step="1" min="1" placeholder="e.g. 500" value={form.original_quantity} onChange={e => setForm(f => ({ ...f, original_quantity: e.target.value }))} />
              </div>
              <div className="form-group mb-0">
                <label className="required">Unit</label>
                <select value={form.unit_type} onChange={e => setForm(f => ({ ...f, unit_type: e.target.value }))}>
                  <option value="pieces">Pieces</option>
                  <option value="meters">Meters</option>
                  <option value="cones">Cones</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="required">Condition</label>
              <select value={form.condition_id || ''} onChange={e => setForm(f => ({ ...f, condition_id: parseInt(e.target.value), condition_notes: '' }))}>
                <option value="" disabled>Select…</option>
                {accConditions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {selectedCondition?.is_other && (
                <div className="mt-2">
                  <label className="required text-sm">Describe condition</label>
                  <textarea value={form.condition_notes} onChange={e => setForm(f => ({ ...f, condition_notes: e.target.value }))} rows="2" />
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="required">Why leftover?</label>
              <select value={form.reason_id || ''} onChange={e => setForm(f => ({ ...f, reason_id: parseInt(e.target.value), reason_other_text: '' }))}>
                <option value="" disabled>Select…</option>
                {reasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {selectedReason?.is_other && (
                <div className="mt-2">
                  <label className="required text-sm">Specify reason</label>
                  <textarea value={form.reason_other_text} onChange={e => setForm(f => ({ ...f, reason_other_text: e.target.value }))} rows="2" />
                </div>
              )}
            </div>
            <InlineAddSelect label="Storage Location *" options={locations} value={form.storage_location_id} onSelect={id => setForm(f => ({ ...f, storage_location_id: id }))} onAdd={addLocation} required />
          </div>
        );
      case 5:
        return renderPhotoStep();
      case 6:
        return renderReview();
      default: return null;
    }
  };

  const renderPhotoStep = () => (
    <div className="flex-col gap-4">
      <h3>Photos <span className="text-error">*</span></h3>
      <p className="text-sm text-muted">At least 1 photo is required. Max 6 photos.</p>
      
      <div className="flex gap-4 mb-4">
        <label className="btn btn-secondary flex-1 flex justify-center items-center gap-2" style={{ height: 'auto', padding: '16px' }}>
          <span style={{ fontSize: '1.5rem' }}>📷</span>
          <span>Take Photo</span>
          <input type="file" multiple accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
        
        <label className="btn flex-1 flex justify-center items-center gap-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', height: 'auto', padding: '16px' }}>
          <span style={{ fontSize: '1.5rem' }}>🖼️</span>
          <span>Gallery</span>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      </div>

      {form.photos.length > 0 && (
        <div className="photo-grid mt-4">
          {form.photos.map((file, i) => (
            <div key={i} className="photo-thumb">
              <img src={URL.createObjectURL(file)} alt="" />
              <button className="photo-thumb-remove" type="button" onClick={() => setForm(f => { const p = [...f.photos]; p.splice(i, 1); return { ...f, photos: p }; })}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="flex-col gap-4">
      <h3>Review & Save</h3>
      {error && <div className="toast toast-error">{error}</div>}
      {selectedMaster && <div className="review-section"><div className="review-section-title">Master Template</div><div className="font-semibold">{selectedMaster.name}</div></div>}
      <div className="review-section">
        <div className="review-section-title">Type</div>
        <div className="font-semibold">{selectedType?.name || selectedMaster?.accessory_type_name}</div>
      </div>
      <div className="review-section">
        <div className="review-section-title">Color & Specs <span className="review-section-edit" onClick={() => setStep(mode === 'quick' ? 1 : 2)}>Edit</span></div>
        <div className="flex items-center gap-2">
          {form.color_display && <span className="color-swatch" style={{ background: form.color_display }} />}
          <span className="font-semibold">{form.pantone_name || form.color_name}</span>
        </div>
        {form.size_spec && <div className="text-sm mt-1">Size: {form.size_spec}</div>}
        {form.material && <div className="text-sm">Material: {form.material}</div>}
      </div>
      <div className="review-section">
        <div className="review-section-title">Quantity <span className="review-section-edit" onClick={() => setStep(mode === 'quick' ? 2 : 4)}>Edit</span></div>
        <div className="font-semibold text-lg">{form.original_quantity} {form.unit_type}</div>
      </div>
      <div className="review-section">
        <div className="review-section-title">Location</div>
        <div className="text-sm">{locations.find(l => l.id === form.storage_location_id)?.name || '—'}</div>
      </div>
      <button className="btn btn-primary btn-full btn-lg mt-4" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="spinner" /> : '✓ Save Accessory Entry'}
      </button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{mode === 'quick' ? '⚡ Quick Add' : 'New Accessory'}</h1>
          <p className="page-subtitle">{selectedMaster ? selectedMaster.name : (selectedType ? selectedType.name : 'Log leftover accessory stock')}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-accent font-mono text-sm">Step {step}/{totalSteps}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setStep(1); setSelectedMaster(null); }}>Cancel</button>
        </div>
      </div>

      <div className="wizard-progress">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex items-center" style={{ flex: i < totalSteps - 1 ? 1 : 0 }}>
            <div className={`wizard-step-dot ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`} />
            {i < totalSteps - 1 && <div className={`wizard-step-line ${step > i + 1 ? 'completed' : ''}`} />}
          </div>
        ))}
      </div>

      <div className="wizard-body">{mode === 'quick' ? renderQuickStep() : renderFullStep()}</div>

      <div className="wizard-footer">
        {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} disabled={loading}>← Back</button>}
        {step < totalSteps && <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canGoNext() || loading}>Continue →</button>}
      </div>
    </div>
  );
}
