import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

const CATEGORIES = [
  { key: 'asset_type', label: 'Hardware Types' },
  { key: 'location', label: 'Locations' },
  { key: 'client', label: 'Clients' },
];

function SettingsList({ category, label }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/settings/${category}`);
      setItems(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [category]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setError('');
    try {
      await api.post(`/settings/${category}`, { value: newValue.trim() });
      setNewValue('');
      setAdding(false);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add');
    }
  };

  const handleEdit = async (id) => {
    if (!editValue.trim()) return;
    setError('');
    try {
      await api.put(`/settings/${category}/${id}`, { value: editValue.trim() });
      setEditId(null);
      setEditValue('');
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleDelete = async (id, value) => {
    if (!window.confirm(`Delete "${value}" from ${label}?`)) return;
    try {
      await api.delete(`/settings/${category}/${id}`);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>{label}</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setError(''); }}>
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {error && <div className="alert alert-danger" style={{ margin: '12px 16px 0' }}>{error}</div>}

        {adding && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--gray-200)', alignItems: 'center' }}>
            <input
              className="form-control"
              placeholder={`New ${label.toLowerCase().replace(/s$/, '')}...`}
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn-icon" onClick={handleAdd} title="Save"><Check size={16} style={{ color: 'var(--success)' }} /></button>
            <button className="btn-icon" onClick={() => { setAdding(false); setNewValue(''); setError(''); }} title="Cancel"><X size={16} /></button>
          </div>
        )}

        {loading ? (
          <p className="text-muted text-center" style={{ padding: 16 }}>Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: 16 }}>No items yet. Click Add to create one.</p>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {items.map(item => (
              <li key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderBottom: '1px solid var(--gray-100)',
              }}>
                {editId === item.id ? (
                  <>
                    <input
                      className="form-control"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEdit(item.id)}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button className="btn-icon" onClick={() => handleEdit(item.id)} title="Save"><Check size={16} style={{ color: 'var(--success)' }} /></button>
                    <button className="btn-icon" onClick={() => { setEditId(null); setEditValue(''); }} title="Cancel"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 14 }}>{item.value}</span>
                    <button className="btn-icon" onClick={() => { setEditId(item.id); setEditValue(item.value); setError(''); }} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(item.id, item.value)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
      </div>
      <p className="text-muted text-sm" style={{ marginBottom: 24 }}>
        Manage dropdown lists used across the application. Changes take effect immediately.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {CATEGORIES.map(c => (
          <SettingsList key={c.key} category={c.key} label={c.label} />
        ))}
      </div>
    </>
  );
}
