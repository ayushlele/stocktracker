import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { useReferenceData } from '../components/FormElements';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Available');
  const [fabricTypeId, setFabricTypeId] = useState('');
  const [sort, setSort] = useState('date_logged_desc');
  const [showFilters, setShowFilters] = useState(false);

  const { data: fabricTypes } = useReferenceData('/fabric-types');

  const loadData = (pageNum, append = false) => {
    setLoading(true);
    const query = new URLSearchParams({ page: pageNum, limit: 20, sort });
    if (search) query.append('search', search);
    if (statusFilter === 'All') query.append('all_statuses', 'true');
    else if (statusFilter) query.append('status', statusFilter);
    if (fabricTypeId) query.append('fabric_type_id', fabricTypeId);

    fetchWithAuth(`/stock?${query.toString()}`)
      .then(res => {
        setStock(prev => append ? [...prev, ...res.data] : res.data);
        setTotal(res.total);
        setHasMore(res.page < res.totalPages);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadData(1, false); }, 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, fabricTypeId, sort]);

  // Handle Load More
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadData(nextPage, true);
  };

  const handleExport = () => {
    const query = new URLSearchParams({ sort });
    if (search) query.append('search', search);
    if (statusFilter === 'All') query.append('all_statuses', 'true');
    else if (statusFilter) query.append('status', statusFilter);
    if (fabricTypeId) query.append('fabric_type_id', fabricTypeId);

    const token = localStorage.getItem('fabric_token');
    window.open(`/api/stock/export/csv?${query.toString()}&token=${token}`, '_blank');
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of leftover fabric stock</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/stock/new')}>+ New Entry</button>
        </div>
      </div>

      {/* Search & Basic Filters */}
      <div className="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input
          type="search"
          placeholder="Search lot code, color, notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="filter-bar" style={{ margin: 0 }}>
          {['Available', 'Reserved', 'Used', 'Disposed', 'All'].map(s => (
            <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s}</button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm text-accent" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'Hide Filters' : 'More Filters'}
        </button>
      </div>

      {showFilters && (
        <div className="filter-panel flex flex-wrap gap-4">
          <div className="form-group" style={{ flex: '1 1 180px', margin: 0 }}>
            <label>Fabric Type</label>
            <select value={fabricTypeId} onChange={e => setFabricTypeId(e.target.value)}>
              <option value="">All Types</option>
              {fabricTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 180px', margin: 0 }}>
            <label>Sort By</label>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="date_logged_desc">Newest First</option>
              <option value="date_logged_asc">Oldest First</option>
              <option value="remaining_desc">Highest Quantity</option>
              <option value="remaining_asc">Lowest Quantity</option>
            </select>
          </div>
        </div>
      )}

      {error && <div className="toast toast-error mb-4">{error}</div>}

      {/* Desktop Table View */}
      <div className="card desktop-table" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Lot Code</th>
              <th>Fabric</th>
              <th>Color</th>
              <th>Qty (m)</th>
              <th>Vendor</th>
              <th>Location</th>
              <th>Status</th>
              <th>Logged</th>
            </tr>
          </thead>
          <tbody>
            {stock.map(item => (
              <tr key={item.id} onClick={() => navigate(`/stock/${item.id}`)}>
                <td className="font-mono text-sm text-accent">{item.lot_code}</td>
                <td>{item.fabric_type_name}</td>
                <td>
                  <div className="flex items-center gap-2">
                    {item.color_display && <span className="color-swatch" style={{ background: item.color_display }} />}
                    {item.pantone_name || item.color_name}
                  </div>
                </td>
                <td className="font-semibold">{item.remaining_quantity_meters}<span className="text-muted text-xs">m</span></td>
                <td className="text-sm text-muted">{item.vendor_name || '—'}</td>
                <td className="text-sm text-muted">{item.storage_location_name || '—'}</td>
                <td><span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span></td>
                <td className="text-sm text-muted">{item.date_logged}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && stock.length === 0 && (
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}><div className="text-muted">No stock entries found.</div></div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="mobile-cards">
        {stock.map(item => (
          <div key={item.id} className="stock-card" onClick={() => navigate(`/stock/${item.id}`)}>
            <div className="stock-card-thumb" style={{ background: item.color_display || 'var(--bg-elevated)', fontSize: '1.5rem' }}>
              {!item.color_display && '🧵'}
            </div>
            <div className="stock-card-info">
              <div className="stock-card-title">
                <span className="truncate">{item.fabric_type_name}</span>
                <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span>
              </div>
              <div className="stock-card-lot">{item.lot_code}</div>
              <div className="stock-card-meta">
                <span className="flex items-center gap-1">
                  {item.color_display && <span className="color-swatch" style={{ background: item.color_display }} />}
                  {item.pantone_name || item.color_name}
                </span>
                {item.vendor_name && <span>· {item.vendor_name}</span>}
                {item.storage_location_name && <span>· {item.storage_location_name}</span>}
              </div>
            </div>
            <div className="stock-card-right">
              <div className="stock-card-qty">{item.remaining_quantity_meters}<small>m</small></div>
              <div className="text-xs text-muted">of {item.original_quantity_meters}m</div>
            </div>
          </div>
        ))}
        {!loading && stock.length === 0 && (
          <div className="empty-state"><div className="empty-state-icon">🔍</div><p className="text-muted">No entries found.</p></div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-6">
          <button 
            className="btn btn-secondary" 
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : 'Load More'}
          </button>
        </div>
      )}
      
      {loading && stock.length === 0 && (
        <div className="loading-center">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
}
