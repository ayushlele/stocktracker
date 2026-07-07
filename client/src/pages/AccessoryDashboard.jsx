import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
      <div className="text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export default function AccessoryDashboard() {
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ available: 0, reserved: 0, used: 0 });

  useEffect(() => {
    setLoading(true);
    fetchWithAuth(`/accessories/dashboard-summary`).then(data => {
      setTypes(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/accessories?status=Available&limit=1'),
      fetchWithAuth('/accessories?status=Reserved&limit=1'),
      fetchWithAuth('/accessories?status=Used&limit=1'),
    ]).then(([a, r, u]) => setStats({ available: a.total, reserved: r.total, used: u.total })).catch(() => {});
  }, []);

  const filteredTypes = types.filter(t => t.type_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">🔘 Accessories</h1>
          <p className="page-subtitle">Grouped by Accessory Type</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/accessories/new')}>+ Add Accessory</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <StatCard label="Available" value={stats.available} color="var(--status-available)" sub="items" />
        <StatCard label="Reserved" value={stats.reserved} color="var(--status-reserved)" sub="items" />
        <StatCard label="Used" value={stats.used} color="var(--status-used)" sub="items" />
      </div>

      {/* Search */}
      <div className="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="search" placeholder="Search accessory types (e.g. Zippers, Buttons)…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {loading
        ? <div className="loading-center"><div className="spinner" /></div>
        : filteredTypes.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">🔘</div><p>No accessories found</p><button className="btn btn-primary mt-4" onClick={() => navigate('/accessories/new')}>+ Add First Accessory</button></div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {filteredTypes.map(type => (
                <div key={type.type_id} className="card hover-raise flex-col gap-2 cursor-pointer" onClick={() => navigate(`/accessories/type/${type.type_id}`)}>
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{type.type_name}</h3>
                    <div className="status-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                      {type.variants_count} variant{type.variants_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-muted mt-2">
                    Total stock: <span className="font-semibold text-primary">{type.total_quantity}</span> <span className="text-sm">{type.default_unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}
