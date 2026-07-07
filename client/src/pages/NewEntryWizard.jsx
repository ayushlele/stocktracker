import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { InlineAddSelect, useReferenceData } from '../components/FormElements';
import PantoneColorPicker from '../components/PantoneColorPicker';

export default function NewEntryWizard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null=choose, 'quick'=master, 'full'=wizard
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Masters
  const [masters, setMasters] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);

  // Reference data
  const { data: fabricTypes, addItem: addFabric, loading: loadingFabric } = useReferenceData('/fabric-types', { activeOnly: true });
  const { data: embTypes, addItem: addEmb, loading: loadingEmb } = useReferenceData('/embroidery-types', { activeOnly: true });
  const { data: printTypes, addItem: addPrint, loading: loadingPrint } = useReferenceData('/printing-types', { activeOnly: true });
  const { data: conditions, loading: loadingCond } = useReferenceData('/condition-options', { activeOnly: true });
  const { data: reasons, loading: loadingReason } = useReferenceData('/reason-options', { activeOnly: true });
  const { data: locations, addItem: addLocation } = useReferenceData('/storage-locations', { activeOnly: true });
  const { data: vendors, addItem: addVendor } = useReferenceData('/vendors', { activeOnly: true });

  useEffect(() => {
    fetchWithAuth('/masters?active_only=true').then(setMasters).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    fabric_type_id: null,
    color_name: '', pantone_code: null, pantone_name: null, color_display: null,
    has_embroidery: false, embroidery_type_id: null, embroidery_description: '',
    has_printing: false, printing_type_id: null, printing_description: '',
    other_design_notes: '',
    vendor_id: null, order_id: null,
    condition_id: null, condition_notes: '',
    original_quantity_meters: '', date_logged: new Date().toISOString().split('T')[0],
    reason_id: null, reason_other_text: '',
    storage_location_id: null, storage_location_other_text: '',
    photos: [],
    master_id: null,
  });

  // Order search
  const [orderSearch, setOrderSearch] = useState('');
  const [orderResults, setOrderResults] = useState([]);
  const [selectedOrderObj, setSelectedOrderObj] = useState(null);

  useEffect(() => {
    if (orderSearch.length < 2) { setOrderResults([]); return; }
    const t = setTimeout(() => {
      fetchWithAuth(`/orders?search=${encodeURIComponent(orderSearch)}`).then(setOrderResults).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [orderSearch]);

  const selectOrder = (o) => { setSelectedOrderObj(o); setForm(f => ({ ...f, order_id: o.id })); setOrderSearch(''); setOrderResults([]); };
  const clearOrder = () => { setSelectedOrderObj(null); setForm(f => ({ ...f, order_id: null })); };

  const selectedCondition = conditions.find(c => c.id === form.condition_id);
  const selectedReason = reasons.find(r => r.id === form.reason_id);
  const fabricConditions = conditions.filter(c => !c.item_type || c.item_type === 'both' || c.item_type === 'fabric');

  // Apply master template
  const applyMaster = (master) => {
    setSelectedMaster(master);
    setForm(f => ({
      ...f,
      fabric_type_id: master.fabric_type_id,
      has_embroidery: !!master.has_embroidery,
      embroidery_type_id: master.embroidery_type_id,
      embroidery_description: master.embroidery_description || '',
      has_printing: !!master.has_printing,
      printing_type_id: master.printing_type_id,
      printing_description: master.printing_description || '',
      other_design_notes: master.other_design_notes || '',
      vendor_id: master.vendor_id,
      reason_id: master.default_reason_id,
      master_id: master.id,
    }));
    setMode('quick');
    setMode('quick');
    setStep(1); // Quick mode: color → qty → condition → location → photos → review
  };

  const FULL_STEPS = 12;
  const QUICK_STEPS = 6;
  const totalSteps = mode === 'quick' ? QUICK_STEPS : FULL_STEPS;

  const canGoNext = () => {
    if (mode === 'quick') {
      switch (step) {
        case 1: return !!form.color_name.trim();
        case 2: return parseFloat(form.original_quantity_meters) > 0 && !!form.date_logged;
        case 3: return !!form.condition_id && (!selectedCondition?.is_other || !!form.condition_notes.trim());
        case 4: return !!form.storage_location_id;
        case 5: return form.photos.length > 0;
        default: return true;
      }
    }
    switch (step) {
      case 1: return !!form.fabric_type_id;
      case 2: return !!form.color_name.trim();
      case 3: return !form.has_embroidery || !!form.embroidery_type_id;
      case 4: return !form.has_printing || !!form.printing_type_id;
      case 5: return true; // vendor optional
      case 6: return true; // order optional
      case 7: return !!form.condition_id && (!selectedCondition?.is_other || !!form.condition_notes.trim());
      case 8: return parseFloat(form.original_quantity_meters) > 0 && !!form.date_logged;
      case 9: return !!form.reason_id && (!selectedReason?.is_other || !!form.reason_other_text.trim());
      case 10: return !!form.storage_location_id;
      case 11: return form.photos.length > 0;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const payload = { ...form };
      delete payload.photos;
      const entry = await fetchWithAuth('/stock', { method: 'POST', body: JSON.stringify(payload) });
      if (form.photos.length > 0) {
        const fd = new FormData();
        form.photos.forEach(f => fd.append('photos', f));
        await fetchWithAuth(`/stock/${entry.id}/photos`, { method: 'POST', body: fd });
      }
      navigate(`/stock/${entry.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create entry');
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
          <h1 className="page-title">New Fabric Entry</h1>
          <p className="page-subtitle">How would you like to log this?</p>
        </div>

        {masters.length > 0 ? (
          <>
            <h3 className="font-semibold mb-4">⚡ Quick Add from Master</h3>
            <p className="text-sm text-muted mb-4">Pick a template — you only fill in color, quantity, and location.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {masters.map(m => (
                <div key={m.id} className="master-card" onClick={() => applyMaster(m)}>
                  <div className="master-card-name">{m.name}</div>
                  <div className="master-card-tags">
                    {m.fabric_type_name && <span className="master-tag">{m.fabric_type_name}</span>}
                    {m.has_embroidery ? <span className="master-tag">Embroidery</span> : null}
                    {m.has_printing ? <span className="master-tag">Print</span> : null}
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
                  ⚡
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Want to speed this up?</h3>
                  <p className="text-sm text-muted m-0">Create a Master template for fabrics you stock often to skip the repetitive steps.</p>
                </div>
              </div>
              <button className="btn btn-outline whitespace-nowrap" onClick={() => navigate('/admin/masters')}>
                + Create Master
              </button>
            </div>
            <div className="sidebar-divider mb-6" />
          </>
        )}

        <button className="btn btn-secondary btn-full" onClick={() => { setMode('full'); setStep(1); }}>
          📋 Full Entry Wizard (12 steps)
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
            <h3>How much fabric?</h3>
            <div className="form-group">
              <label className="required">Length in Meters</label>
              <input type="number" step="0.1" min="0.1" placeholder="e.g. 50.5" value={form.original_quantity_meters} onChange={e => setForm(f => ({ ...f, original_quantity_meters: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="required">Date</label>
              <input type="date" value={form.date_logged} onChange={e => setForm(f => ({ ...f, date_logged: e.target.value }))} />
            </div>
            <InlineAddSelect label="Vendor" options={vendors} value={form.vendor_id} onSelect={id => setForm(f => ({ ...f, vendor_id: id }))} onAdd={addVendor} allowNone noneLabel="Unknown" />
          </div>
        );
      case 3:
        return (
          <div className="flex-col gap-4">
            <h3>Condition?</h3>
            <div className="flex-col gap-2">
              {conditions.map(c => (
                <label key={c.id} className="card flex items-center gap-3" style={{ padding: 'var(--space-3)', margin: 0, cursor: 'pointer', borderColor: form.condition_id === c.id ? 'var(--accent)' : '' }}>
                  <input type="radio" name="cond" checked={form.condition_id === c.id} onChange={() => setForm(f => ({ ...f, condition_id: c.id }))} style={{ width: 'auto' }} />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="flex-col gap-4">
            <h3>Where is it stored?</h3>
            <InlineAddSelect label="Storage Location" options={locations} value={form.storage_location_id} onSelect={id => setForm(f => ({ ...f, storage_location_id: id }))} onAdd={addLocation} required />
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
            <h3>What type of fabric?</h3>
            <InlineAddSelect label="Fabric Type" options={fabricTypes} value={form.fabric_type_id} onSelect={id => setForm(f => ({ ...f, fabric_type_id: id }))} onAdd={addFabric} loading={loadingFabric} required />
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
            <h3>Embroidery?</h3>
            <div className="toggle-group">
              <div className={`toggle-option ${!form.has_embroidery ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, has_embroidery: false, embroidery_type_id: null }))}>No</div>
              <div className={`toggle-option ${form.has_embroidery ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, has_embroidery: true }))}>Yes</div>
            </div>
            {form.has_embroidery && (
              <div className="card mt-4 flex-col gap-4">
                <InlineAddSelect label="Embroidery Type *" options={embTypes} value={form.embroidery_type_id} onSelect={id => setForm(f => ({ ...f, embroidery_type_id: id }))} onAdd={addEmb} loading={loadingEmb} />
                <div className="form-group mb-0"><label>Description</label><textarea placeholder="Thread pattern, placement…" value={form.embroidery_description} onChange={e => setForm(f => ({ ...f, embroidery_description: e.target.value }))} /></div>
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="flex-col gap-4">
            <h3>Printing?</h3>
            <div className="toggle-group">
              <div className={`toggle-option ${!form.has_printing ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, has_printing: false, printing_type_id: null }))}>No</div>
              <div className={`toggle-option ${form.has_printing ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, has_printing: true }))}>Yes</div>
            </div>
            {form.has_printing && (
              <div className="card mt-4 flex-col gap-4">
                <InlineAddSelect label="Print Type *" options={printTypes} value={form.printing_type_id} onSelect={id => setForm(f => ({ ...f, printing_type_id: id }))} onAdd={addPrint} loading={loadingPrint} />
                <div className="form-group mb-0"><label>Description</label><textarea placeholder="Motif, scale, colors…" value={form.printing_description} onChange={e => setForm(f => ({ ...f, printing_description: e.target.value }))} /></div>
              </div>
            )}
            <div className="form-group mt-4 mb-0">
              <label>Other Design Notes</label>
              <textarea placeholder="Sequins, pre-washed, crinkle…" value={form.other_design_notes} onChange={e => setForm(f => ({ ...f, other_design_notes: e.target.value }))} />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="flex-col gap-4">
            <h3>Vendor (who supplied this fabric?)</h3>
            <InlineAddSelect label="Vendor" options={vendors} value={form.vendor_id} onSelect={id => setForm(f => ({ ...f, vendor_id: id }))} onAdd={addVendor} allowNone noneLabel="Unknown" />
          </div>
        );
      case 6:
        return (
          <div className="flex-col gap-4">
            <h3>Linked Order (optional)</h3>
            <div className="search-bar">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search by order number or style…" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
            </div>
            {selectedOrderObj && (
              <div className="card flex justify-between items-center" style={{ borderColor: 'var(--success)', background: 'var(--success-bg)', padding: 'var(--space-3)' }}>
                <div><div className="font-semibold">{selectedOrderObj.order_number}</div><div className="text-xs text-muted">{selectedOrderObj.style_name}</div></div>
                <button className="btn btn-ghost btn-sm" onClick={clearOrder}>Clear</button>
              </div>
            )}
            {orderResults.length > 0 && (
              <div className="card" style={{ padding: 0 }}>
                {orderResults.map(o => (
                  <div key={o.id} className="dropdown-item" onClick={() => selectOrder(o)}>
                    <div><div className="font-semibold">{o.order_number}</div><div className="text-xs text-muted">{o.style_name} · {o.buyer_name}</div></div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-muted text-center">Skip if not tied to a specific order</p>
          </div>
        );
      case 7:
        return (
          <div className="flex-col gap-4">
            <h3>Condition?</h3>
            <div className="flex-col gap-2">
              {fabricConditions.map(c => (
                <label key={c.id} className="card flex items-center gap-3" style={{ padding: 'var(--space-3)', margin: 0, cursor: 'pointer', borderColor: form.condition_id === c.id ? 'var(--accent)' : '' }}>
                  <input type="radio" name="cond" checked={form.condition_id === c.id} onChange={() => setForm(f => ({ ...f, condition_id: c.id, condition_notes: '' }))} style={{ width: 'auto' }} />
                  {c.name}
                </label>
              ))}
            </div>
            {form.condition_id && (
              <div className="form-group mt-2 mb-0">
                <label className={selectedCondition?.is_other ? 'required' : ''}>{selectedCondition?.is_other ? 'Describe condition' : 'Notes (optional)'}</label>
                <textarea value={form.condition_notes} onChange={e => setForm(f => ({ ...f, condition_notes: e.target.value }))} placeholder="Any specific notes…" />
              </div>
            )}
          </div>
        );
      case 8:
        return (
          <div className="flex-col gap-4">
            <h3>Quantity</h3>
            <div className="form-group">
              <label className="required">Length in Meters</label>
              <input type="number" step="0.1" min="0.1" placeholder="e.g. 50.5" value={form.original_quantity_meters} onChange={e => setForm(f => ({ ...f, original_quantity_meters: e.target.value }))} />
              <p className="text-xs text-muted mt-2">This opening quantity is locked after saving. Deduct via usage log.</p>
            </div>
            <div className="form-group mb-0">
              <label className="required">Date Logged</label>
              <input type="date" value={form.date_logged} onChange={e => setForm(f => ({ ...f, date_logged: e.target.value }))} />
            </div>
          </div>
        );
      case 9:
        return (
          <div className="flex-col gap-4">
            <h3>Why is this leftover?</h3>
            <select value={form.reason_id || ''} onChange={e => setForm(f => ({ ...f, reason_id: parseInt(e.target.value), reason_other_text: '' }))}>
              <option value="" disabled>Select reason…</option>
              {reasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {selectedReason?.is_other && (
              <div className="form-group mt-2 mb-0">
                <label className="required">Specify reason</label>
                <textarea value={form.reason_other_text} onChange={e => setForm(f => ({ ...f, reason_other_text: e.target.value }))} />
              </div>
            )}
          </div>
        );
      case 10:
        return (
          <div className="flex-col gap-4">
            <h3>Where is it stored?</h3>
            <InlineAddSelect label="Storage Location" options={locations} value={form.storage_location_id} onSelect={id => setForm(f => ({ ...f, storage_location_id: id }))} onAdd={addLocation} required />
          </div>
        );
      case 11:
        return renderPhotoStep();
      case 12:
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
        <div className="review-section-title">Fabric <span className="review-section-edit" onClick={() => setStep(mode === 'quick' ? 1 : 1)}>Edit</span></div>
        <div className="flex items-center gap-2 mt-1">
          {form.color_display && <span className="color-swatch" style={{ background: form.color_display }} />}
          <span className="font-semibold">{form.pantone_name || form.color_name}</span>
          {form.pantone_code && <span className="text-xs text-muted">Pantone {form.pantone_code} TCX</span>}
        </div>
        {form.fabric_type_id && <div className="text-sm mt-1">{fabricTypes.find(f => f.id === form.fabric_type_id)?.name}</div>}
      </div>
      <div className="review-section">
        <div className="review-section-title">Quantity</div>
        <div className="font-semibold text-lg">{form.original_quantity_meters} meters</div>
        <div className="text-sm text-muted">{form.date_logged}</div>
      </div>
      <div className="review-section">
        <div className="review-section-title">Location & Vendor</div>
        <div className="text-sm">{locations.find(l => l.id === form.storage_location_id)?.name || '—'}</div>
        <div className="text-sm text-muted">{vendors.find(v => v.id === form.vendor_id)?.name || 'No vendor'}</div>
      </div>
      <button className="btn btn-primary btn-full btn-lg mt-4" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="spinner" /> : '✓ Save Entry'}
      </button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{mode === 'quick' ? '⚡ Quick Add' : 'New Entry'}</h1>
          <p className="page-subtitle">{selectedMaster ? selectedMaster.name : 'Log leftover fabric'}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-accent font-mono text-sm">Step {step}/{totalSteps}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setStep(1); setSelectedMaster(null); }}>Cancel</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="wizard-progress">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex items-center" style={{ flex: i < totalSteps - 1 ? 1 : 0 }}>
            <div className={`wizard-step-dot ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`} />
            {i < totalSteps - 1 && <div className={`wizard-step-line ${step > i + 1 ? 'completed' : ''}`} />}
          </div>
        ))}
      </div>

      <div className="wizard-body">
        {mode === 'quick' ? renderQuickStep() : renderFullStep()}
      </div>

      <div className="wizard-footer">
        {step > 1 && (
          <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} disabled={loading}>← Back</button>
        )}
        {step < totalSteps && (
          <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canGoNext() || loading}>Continue →</button>
        )}
      </div>
    </div>
  );
}
