import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { statusBadge, formatDate, ASSET_STATUSES } from '../utils/helpers';
import { Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const emptyAsset = {
  device_name: '', serial_number: '', asset_type: '', make: '', model: '',
  location: '', client: '', assigned_to: '', status: 'Available',
  warranty_date: '', commentary: '',
};

function useSettings() {
  const [settings, setSettings] = useState({ asset_type: [], location: [], client: [] });

  useEffect(() => {
    api.get('/settings').then(r => {
      setSettings({
        asset_type: (r.data.asset_type || []).map(x => x.value),
        location: (r.data.location || []).map(x => x.value),
        client: (r.data.client || []).map(x => x.value),
      });
    }).catch(() => {});
  }, []);

  return settings;
}

export default function Assets() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'asset_manager', 'full_operator');
  const canDelete = hasRole('admin');
  const settings = useSettings();
  const [searchParams] = useSearchParams();

  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    asset_type: searchParams.get('asset_type') || '',
    location: searchParams.get('location') || '',
    client: searchParams.get('client') || '',
    sort_by: 'created_at',
    sort_order: 'DESC',
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyAsset);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [auditComment, setAuditComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25, ...filters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const { data } = await api.get('/assets', { params });
      setAssets(data.assets);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const openCreate = () => {
    setForm({ ...emptyAsset, asset_type: settings.asset_type[0] || '' });
    setEditMode(false);
    setError('');
    setAuditComment('');
    setShowModal(true);
  };

  const openEdit = (asset) => {
    setForm({
      ...asset,
      warranty_date: asset.warranty_date ? asset.warranty_date.split('T')[0] : '',
    });
    setEditMode(true);
    setError('');
    setAuditComment('');
    setShowModal(true);
  };

  const openDetail = (asset) => {
    setSelectedAsset(asset);
    setShowDetail(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, audit_comment: auditComment };
      if (!payload.warranty_date) delete payload.warranty_date;
      if (editMode) {
        await api.put(`/assets/${form.id}`, payload);
      } else {
        await api.post('/assets', payload);
      }
      setShowModal(false);
      fetchAssets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (asset) => {
    if (!window.confirm(`Delete asset ${asset.serial_number}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/assets/${asset.id}`);
      fetchAssets();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete asset');
    }
  };

  const handleSort = (col) => {
    setFilters(f => ({
      ...f,
      sort_by: col,
      sort_order: f.sort_by === col && f.sort_order === 'ASC' ? 'DESC' : 'ASC',
    }));
    setPage(1);
  };

  const sortIndicator = (col) => {
    if (filters.sort_by !== col) return '';
    return filters.sort_order === 'ASC' ? ' ▲' : ' ▼';
  };

  return (
    <>
      <div className="page-header">
        <h2>Assets ({total})</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Asset
          </button>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="form-control search-input"
          placeholder="Search device name, serial, make, model, assigned to..."
          value={filters.search}
          onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
        />
        <select className="form-control" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
          <option value="">All Statuses</option>
          {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-control" value={filters.asset_type} onChange={e => { setFilters(f => ({ ...f, asset_type: e.target.value })); setPage(1); }}>
          <option value="">All Types</option>
          {settings.asset_type.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-control" value={filters.location} onChange={e => { setFilters(f => ({ ...f, location: e.target.value })); setPage(1); }}>
          <option value="">All Locations</option>
          {settings.location.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="form-control" value={filters.client} onChange={e => { setFilters(f => ({ ...f, client: e.target.value })); setPage(1); }}>
          <option value="">All Clients</option>
          {settings.client.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('device_name')}>Device Name{sortIndicator('device_name')}</th>
                <th onClick={() => handleSort('serial_number')}>Serial Number{sortIndicator('serial_number')}</th>
                <th onClick={() => handleSort('asset_type')}>Type{sortIndicator('asset_type')}</th>
                <th onClick={() => handleSort('make')}>Make{sortIndicator('make')}</th>
                <th onClick={() => handleSort('model')}>Model{sortIndicator('model')}</th>
                <th onClick={() => handleSort('location')}>Location{sortIndicator('location')}</th>
                <th onClick={() => handleSort('client')}>Client{sortIndicator('client')}</th>
                <th>Assigned To</th>
                <th onClick={() => handleSort('status')}>Status{sortIndicator('status')}</th>
                <th onClick={() => handleSort('warranty_date')}>Warranty{sortIndicator('warranty_date')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center text-muted">Loading...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-muted">No assets found</td></tr>
              ) : assets.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.device_name || '—'}</strong></td>
                  <td>{a.serial_number}</td>
                  <td>{a.asset_type}</td>
                  <td>{a.make || '—'}</td>
                  <td>{a.model || '—'}</td>
                  <td>{a.location || '—'}</td>
                  <td>{a.client || '—'}</td>
                  <td>{a.assigned_to || '—'}</td>
                  <td><span className={`badge ${statusBadge(a.status)}`}>{a.status}</span></td>
                  <td>{formatDate(a.warranty_date)}</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn-icon" onClick={() => openDetail(a)} title="View"><Eye size={16} /></button>
                      {canEdit && <button className="btn-icon" onClick={() => openEdit(a)} title="Edit"><Edit2 size={16} /></button>}
                      {canDelete && <button className="btn-icon" onClick={() => handleDelete(a)} title="Delete"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Page {page} of {totalPages} ({total} assets)
            </div>
            <div className="pagination-buttons">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          title={editMode ? `Edit Asset: ${form.serial_number}` : 'New Asset'}
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
              <label>Device Name</label>
              <input className="form-control" value={form.device_name || ''} onChange={e => setForm(f => ({ ...f, device_name: e.target.value }))} placeholder="e.g. John's Laptop" />
            </div>
            <div className="form-group">
              <label>Serial Number *</label>
              <input className="form-control" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} disabled={editMode} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Hardware Type *</label>
              <select className="form-control" value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}>
                <option value="">Select type...</option>
                {settings.asset_type.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Make</label>
              <input className="form-control" value={form.make || ''} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input className="form-control" value={form.model || ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <select className="form-control" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                <option value="">Select location...</option>
                {settings.location.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Client</label>
              <select className="form-control" value={form.client || ''} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}>
                <option value="">Select client...</option>
                {settings.client.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Assigned To</label>
              <input className="form-control" value={form.assigned_to || ''} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Employee name or leave empty" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Warranty Date</label>
              <input className="form-control" type="date" value={form.warranty_date || ''} onChange={e => setForm(f => ({ ...f, warranty_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Commentary</label>
            <textarea className="form-control" value={form.commentary || ''} onChange={e => setForm(f => ({ ...f, commentary: e.target.value }))} />
          </div>
          {editMode && (
            <div className="form-group">
              <label>Audit Comment (reason for changes)</label>
              <input className="form-control" value={auditComment} onChange={e => setAuditComment(e.target.value)} placeholder="Optional: describe why this change was made" />
            </div>
          )}
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail && selectedAsset && (
        <Modal
          title={`Asset: ${selectedAsset.serial_number}`}
          onClose={() => setShowDetail(false)}
          footer={<button className="btn btn-outline" onClick={() => setShowDetail(false)}>Close</button>}
        >
          <AssetDetail asset={selectedAsset} />
        </Modal>
      )}
    </>
  );
}

function AssetDetail({ asset }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    api.get(`/assets/audit/${asset.id}`).then(r => { setLogs(r.data.logs); setLoadingLogs(false); })
      .catch(() => setLoadingLogs(false));
  }, [asset.id]);

  return (
    <div>
      <div className="form-row">
        <div className="form-group"><label>Device Name</label><p><strong>{asset.device_name || '—'}</strong></p></div>
        <div className="form-group"><label>Serial Number</label><p>{asset.serial_number}</p></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Type</label><p>{asset.asset_type}</p></div>
        <div className="form-group"><label>Status</label><p><span className={`badge ${statusBadge(asset.status)}`}>{asset.status}</span></p></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Make</label><p>{asset.make || '—'}</p></div>
        <div className="form-group"><label>Model</label><p>{asset.model || '—'}</p></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Location</label><p>{asset.location || '—'}</p></div>
        <div className="form-group"><label>Client</label><p>{asset.client || '—'}</p></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Assigned To</label><p>{asset.assigned_to || '—'}</p></div>
        <div className="form-group"><label>Warranty Date</label><p>{formatDate(asset.warranty_date)}</p></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Created</label><p>{formatDate(asset.created_at)}</p></div>
        <div className="form-group"><label>Updated</label><p>{formatDate(asset.updated_at)}</p></div>
      </div>
      {asset.commentary && (
        <div className="form-group"><label>Commentary</label><p>{asset.commentary}</p></div>
      )}

      <h4 style={{ marginTop: 20, marginBottom: 10 }}>Audit History</h4>
      {loadingLogs ? <p className="text-muted">Loading...</p> : logs.length === 0 ? (
        <p className="text-muted">No audit records</p>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Action</th><th>Field</th><th>From</th><th>To</th><th>By</th><th>Date</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td><span className="badge badge-assigned">{l.action}</span></td>
                  <td>{l.field_changed || '—'}</td>
                  <td className="text-sm">{l.old_value || '—'}</td>
                  <td className="text-sm">{l.new_value || '—'}</td>
                  <td>{l.performed_by}</td>
                  <td className="text-sm">{formatDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
