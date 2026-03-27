import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import { formatDate } from '../utils/helpers';
import { Plus, Edit2, UserCheck, UserX } from 'lucide-react';

const ROLES = ['admin', 'technician', 'auditor'];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', role: 'technician' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setForm({ username: '', email: '', password: '', full_name: '', role: 'technician' });
    setEditMode(false);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setForm({ ...user, password: '' });
    setEditMode(true);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (editMode) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/auth/users/${form.id}`, payload);
      } else {
        await api.post('/auth/users', form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/auth/users/${user.id}`, { is_active: !user.is_active });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user');
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>User Management</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> New User
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted">Loading...</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge badge-assigned" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-available' : 'badge-decommissioned'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-sm">{formatDate(u.created_at)}</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn-icon" onClick={() => openEdit(u)} title="Edit"><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => toggleActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}>
                        {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal
          title={editMode ? `Edit User: ${form.username}` : 'New User'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editMode ? 'Update' : 'Create')}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Username *</label>
              <input className="form-control" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={editMode} required />
            </div>
            <div className="form-group">
              <label>Full Name *</label>
              <input className="form-control" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input className="form-control" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Role *</label>
              <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>{editMode ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
            <input className="form-control" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editMode} />
          </div>
        </Modal>
      )}
    </>
  );
}
