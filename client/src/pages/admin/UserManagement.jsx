import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add User State
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', pin: '', role: 'staff' });
  const [adding, setAdding] = useState(false);

  // Edit User State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', is_active: 1 });
  const [saving, setSaving] = useState(false);

  // Reset PIN State
  const [resetId, setResetId] = useState(null);
  const [resetPin, setResetPin] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchWithAuth('/users');
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await fetchWithAuth('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: addForm.name.trim(),
          pin: addForm.pin,
          role: addForm.role
        })
      });
      setShowAdd(false);
      setAddForm({ name: '', pin: '', role: 'staff' });
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({ name: user.name, role: user.role, is_active: user.is_active });
    setResetId(null);
  };

  const handleSave = async (e, id) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchWithAuth(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          role: editForm.role,
          is_active: !!editForm.is_active
        })
      });
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPin = async (e, id) => {
    e.preventDefault();
    setResetting(true);
    try {
      await fetchWithAuth(`/users/${id}/pin`, {
        method: 'PUT',
        body: JSON.stringify({ pin: resetPin })
      });
      setResetId(null);
      setResetPin('');
      alert('PIN updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to reset PIN');
    } finally {
      setResetting(false);
    }
  };

  const toggleActive = async (targetUser) => {
    if (targetUser.id === currentUser.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    
    try {
      await fetchWithAuth(`/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !targetUser.is_active })
      });
      await loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage staff access and roles</p>
        </div>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {error && <div className="toast toast-error mb-4">{error}</div>}

      {showAdd && (
        <div className="card mb-6" style={{ borderColor: 'var(--accent)' }}>
          <h3 className="card-title mb-4">Add New User</h3>
          <form onSubmit={handleAdd} className="flex-col gap-4">
            <div className="form-group">
              <label className="required">Name</label>
              <input
                type="text"
                required
                value={addForm.name}
                onChange={e => setAddForm({ ...addForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="required">4-6 Digit PIN</label>
              <input
                type="text"
                required
                pattern="^\d{4,6}$"
                value={addForm.pin}
                onChange={e => setAddForm({ ...addForm, pin: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select 
                value={addForm.role} 
                onChange={e => setAddForm({ ...addForm, role: e.target.value })}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {users.map(u => {
            const isEditing = editingId === u.id;
            const isResetting = resetId === u.id;
            const isMe = currentUser.id === u.id;

            return (
              <div key={u.id} className={`ref-list-item flex-col items-stretch ${!u.is_active ? 'inactive' : ''}`}>
                <div className="flex justify-between items-center w-full">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {u.name}
                      {u.role === 'admin' && <span className="status-badge status-reserved">Admin</span>}
                      {isMe && <span className="text-xs bg-bg-primary px-2 py-1 rounded">You</span>}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Created: {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {!isEditing && !isResetting && (
                    <div className="flex gap-3 items-center">
                      <button className="text-accent text-sm hover:underline" onClick={() => startEdit(u)}>
                        Edit
                      </button>
                      <button className="text-muted text-sm hover:underline" onClick={() => setResetId(u.id)}>
                        Reset PIN
                      </button>
                      <label className="switch" title={u.is_active ? 'Deactivate' : 'Activate'}>
                        <input
                          type="checkbox"
                          checked={u.is_active === 1}
                          onChange={() => toggleActive(u)}
                          disabled={isMe}
                        />
                        <span className="switch-slider"></span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <form onSubmit={(e) => handleSave(e, u.id)} className="mt-4 p-4 bg-bg-primary rounded-lg flex gap-3 flex-wrap items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs mb-1 block text-muted">Name</label>
                      <input 
                        type="text" 
                        required 
                        value={editForm.name} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})} 
                      />
                    </div>
                    <div className="w-[120px]">
                      <label className="text-xs mb-1 block text-muted">Role</label>
                      <select 
                        value={editForm.role} 
                        onChange={e => setEditForm({...editForm, role: e.target.value})}
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>Save</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </form>
                )}

                {/* Reset PIN Form */}
                {isResetting && (
                  <form onSubmit={(e) => handleResetPin(e, u.id)} className="mt-4 p-4 bg-bg-primary rounded-lg flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs mb-1 block text-muted">New PIN (4-6 digits)</label>
                      <input 
                        type="text" 
                        required 
                        pattern="^\d{4,6}$"
                        value={resetPin} 
                        onChange={e => setResetPin(e.target.value)} 
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn btn-warning btn-sm bg-warning text-inverse px-3 rounded" disabled={resetting}>Reset</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetId(null)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
          {users.length === 0 && <div className="text-center py-8 text-muted">No users found.</div>}
        </div>
      )}
    </div>
  );
}
