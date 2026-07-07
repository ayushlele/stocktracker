import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';

function ColorSwatch({ hex, name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {hex && <span className="color-swatch" style={{ background: hex, width: 18, height: 18 }} />}
      <span>{name || '—'}</span>
    </div>
  );
}

export default function AccessoryTypeList() {
  const navigate = useNavigate();
  const { typeId } = useParams();
  const [items, setItems] = useState([]);
  const [typeName, setTypeName] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ 
      accessory_type_id: typeId,
      page, 
      limit: 20, 
      ...(search && { search }), 
      ...(statusFilter ? { status: statusFilter } : { all_statuses: 'true' }) 
    });
    fetchWithAuth(`/accessories?${params}`).then(d => {
      setItems(d.data);
      setTotal(d.total);
      if (d.data.length > 0 && !typeName) {
        setTypeName(d.data[0].accessory_type_name);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page, search, statusFilter, typeId]);

  const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'Available', label: 'Available' },
    { value: 'Reserved', label: 'Reserved' },
    { value: 'Used', label: 'Used' },
    { value: 'Disposed', label: 'Disposed' },
  ];

  return (
    <div>
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="text-sm text-accent cursor-pointer mb-2 font-semibold hover-raise" style={{display: 'inline-block'}} onClick={() => navigate('/accessories')}>
            ← Back to Accessory Types
          </div>
          <h1 className="page-title">{typeName || 'Accessories'} Variants</h1>
          <p className="page-subtitle">{total} variants found</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/accessories/new')}>+ Add {typeName || 'Accessory'}</button>
      </div>

      {/* Search & Filters */}
      <div className="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="search" placeholder="Search by color, size, lot code…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="filter-bar">
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} className={`filter-chip ${statusFilter === s.value ? 'active' : ''}`} onClick={() => { setStatusFilter(s.value); setPage(1); }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : items.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">🔘</div><p>No variants found</p><button className="btn btn-primary mt-4" onClick={() => navigate('/accessories/new')}>+ Add Variant</button></div>
          : <>
              {items.map(item => (
                <div key={item.id} className="stock-card hover-raise" onClick={() => navigate(`/accessories/${item.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="stock-card-thumb" style={{ background: item.color_display || 'var(--bg-elevated)', fontSize: '1.5rem', flexShrink: 0 }}>
                    {!item.color_display && '🔘'}
                  </div>
                  <div className="stock-card-info">
                    <div className="stock-card-title">
                      <span>{item.accessory_type_name} - {item.pantone_name || item.color_name}</span>
                      <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span>
                    </div>
                    <div className="stock-card-meta mt-1">
                      <ColorSwatch hex={item.color_display} name={item.pantone_name || item.color_name} />
                      {item.size_spec && <span>· {item.size_spec}</span>}
                      {item.material && <span>· {item.material}</span>}
                      {item.vendor_name && <span>· {item.vendor_name}</span>}
                    </div>
                    <div className="stock-card-lot mt-2">{item.lot_code}</div>
                  </div>
                  <div className="stock-card-right" style={{ textAlign: 'right' }}>
                    <div className="stock-card-qty text-xl font-bold">{item.remaining_quantity}<small className="text-sm font-normal text-muted ml-1">{item.unit_type}</small></div>
                    <div className="text-xs text-muted mt-1">of {item.original_quantity} {item.unit_type}</div>
                    <div className="text-xs text-muted mt-1">{item.storage_location_name || '—'}</div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {total > 20 && (
                <div className="flex justify-center gap-3 mt-6">
                  <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span className="text-sm text-muted items-center flex">Page {page} of {Math.ceil(total / 20)}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
      }
    </div>
  );
}
