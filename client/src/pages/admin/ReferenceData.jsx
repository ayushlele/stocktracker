import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';

const TABLES = [
  { id: 'fabric-types', label: 'Fabric Types', hasOther: false },
  { id: 'embroidery-types', label: 'Embroidery Types', hasOther: false },
  { id: 'printing-types', label: 'Printing Types', hasOther: false },
  { id: 'condition-options', label: 'Condition Options', hasOther: true, hasItemType: true },
  { id: 'reason-options', label: 'Reason Options', hasOther: true },
  { id: 'accessory-types', label: 'Accessory Types', hasOther: false, hasUnit: true },
  { id: 'storage-locations', label: 'Storage Locations', hasOther: false },
];

export default function ReferenceData() {
  const [activeTab, setActiveTab] = useState(TABLES[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('pieces');
  const [newItemType, setNewItemType] = useState('both');
  const [adding, setAdding] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('pieces');
  const [editItemType, setEditItemType] = useState('both');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/${activeTab.id}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setAdding(true);
    try {
      const payload = { name: newName.trim() };
      if (activeTab.hasUnit) payload.default_unit = newUnit;
      if (activeTab.hasItemType) payload.item_type = newItemType;
      
      await fetchWithAuth(`/${activeTab.id}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setNewName('');
      setNewUnit('pieces');
      setNewItemType('both');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item) => {
    if (activeTab.hasOther && item.is_other) return; // Cannot edit Other
    setEditingId(item.id);
    setEditName(item.name);
    if (activeTab.hasUnit) setEditUnit(item.default_unit || 'pieces');
    if (activeTab.hasItemType) setEditItemType(item.item_type || 'both');
  };

  const saveEdit = async (item) => {
    if (editName.trim() === item.name && 
        (!activeTab.hasUnit || editUnit === item.default_unit) && 
        (!activeTab.hasItemType || editItemType === item.item_type)) {
      setEditingId(null);
      return;
    }
    
    setSaving(true);
    try {
      const payload = { name: editName.trim() };
      if (activeTab.hasUnit) payload.default_unit = editUnit;
      if (activeTab.hasItemType) payload.item_type = editItemType;

      await fetchWithAuth(`/${activeTab.id}/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setEditingId(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    if (activeTab.hasOther && item.is_other) {
      alert('Cannot deactivate the system "Other" option');
      return;
    }
    
    try {
      await fetchWithAuth(`/${activeTab.id}/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !item.is_active })
      });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Reference Data</h1>
        <p className="page-subtitle">Manage dropdown options across the app</p>
      </div>

      <div className="tabs mb-6" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {TABLES.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab.id === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {/* Add New Form */}
        <form onSubmit={handleAdd} className="inline-add-form bg-elevated" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`Add new ${activeTab.label.toLowerCase()}...`}
            disabled={adding}
            style={{ flex: 1 }}
          />
          {activeTab.hasUnit && (
            <select
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              disabled={adding}
              style={{ flex: '0 0 auto', width: '120px' }}
            >
              <option value="pieces">Pieces</option>
              <option value="meters">Meters</option>
              <option value="cones">Cones</option>
            </select>
          )}
          {activeTab.hasItemType && (
            <select
              value={newItemType}
              onChange={e => setNewItemType(e.target.value)}
              disabled={adding}
              style={{ flex: '0 0 auto', width: '120px' }}
            >
              <option value="both">Both</option>
              <option value="fabric">Fabric Only</option>
              <option value="accessory">Accessory Only</option>
            </select>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={!newName.trim() || adding}>
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>

        {error && <div className="p-4 text-error">{error}</div>}

        {loading ? (
          <div className="loading-center py-8"><div className="spinner"></div></div>
        ) : (
          <div>
            {data.length === 0 && <div className="text-center py-8 text-muted">No entries found.</div>}
            
            {data.map(item => {
              const isSystemOther = activeTab.hasOther && item.is_other === 1;
              const isEditing = editingId === item.id;
              
              return (
                <div 
                  key={item.id} 
                  className={`ref-list-item ${!item.is_active ? 'inactive' : ''} ${isSystemOther ? 'system' : ''}`}
                >
                  {isEditing ? (
                    <div className="flex gap-2" style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(item);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        style={{ flex: 1 }}
                      />
                      {activeTab.hasUnit && (
                        <select
                          value={editUnit}
                          onChange={e => setEditUnit(e.target.value)}
                          style={{ flex: '0 0 auto', width: '100px' }}
                        >
                          <option value="pieces">Pieces</option>
                          <option value="meters">Meters</option>
                          <option value="cones">Cones</option>
                        </select>
                      )}
                      {activeTab.hasItemType && (
                        <select
                          value={editItemType}
                          onChange={e => setEditItemType(e.target.value)}
                          style={{ flex: '0 0 auto', width: '110px' }}
                        >
                          <option value="both">Both</option>
                          <option value="fabric">Fabric</option>
                          <option value="accessory">Accessory</option>
                        </select>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(item)} disabled={saving}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {activeTab.hasUnit && <span className="text-sm text-muted">({item.default_unit})</span>}
                          {activeTab.hasItemType && <span className="text-sm text-muted">[{item.item_type}]</span>}
                          {isSystemOther && <span className="text-xs bg-bg-primary px-2 py-1 rounded">System Default</span>}
                        </div>
                      </div>
                      
                      {!isSystemOther && (
                        <div className="flex gap-3 items-center">
                          <button className="text-accent text-sm hover:underline" onClick={() => startEdit(item)}>
                            Edit
                          </button>
                          
                          <label className="switch" title={item.is_active ? 'Deactivate' : 'Activate'}>
                            <input
                              type="checkbox"
                              checked={item.is_active === 1}
                              onChange={() => toggleActive(item)}
                            />
                            <span className="switch-slider"></span>
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
