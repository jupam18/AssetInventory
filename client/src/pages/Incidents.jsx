import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, { getIncidents, createIncident, updateIncident, deleteIncident } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import {
  formatDate, formatDateTime,
  priorityBadge, incidentStatusBadge, incidentTypeBadge,
  INCIDENT_STATUSES, INCIDENT_TYPES, INCIDENT_PRIORITIES,
} from '../utils/helpers';
import { Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';

const BODY_PLACEHOLDER = `Nombre: \nDirección: \nTeléfono: \nSe envía:`;

const emptyIncident = {
  incident_number: '', title: '', type: 'Onboarding', priority: 'Medium',
  status: 'Open', assigned_to: '', description: '', body: '', notes: '',
  asset_ids: [],
};

// Asset multi-selector component
function AssetSelector({ selectedIds, onChange, readonly }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);

  useEffect(() => {
    if (selectedIds.length === 0) { setSelectedAssets([]); return; }
    api.get('/assets', { params: { limit: 200 } }).then(r => {
      setSelectedAssets(r.data.assets.filter(a => selectedIds.includes(a.id)));
    }).catch(() => {});
  }, [selectedIds.join(',')]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      api.get('/assets', { params: { search, limit: 10 } }).then(r => {
        setResults(r.data.assets.filter(a => !selectedIds.includes(a.id)));
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedIds.join(',')]);

  const add = (asset) => {
    onChange([...selectedIds, asset.id]);
    setSearch('');
    setResults([]);
  };

  const remove = (id) => onChange(selectedIds.filter(x => x !== id));

  if (readonly) {
    return (
      <div className="asset-selector-tags">
        {selectedAssets.length === 0
          ? <span className="text-muted text-sm">No assets linked</span>
          : selectedAssets.map(a => (
            <span key={a.id} className="asset-tag">
              {a.device_name ? `${a.device_name} (${a.serial_number})` : a.serial_number}
            </span>
          ))}
      </div>
    );
  }

  return (
    <div className="asset-selector">
      <div className="asset-selector-tags">
        {selectedAssets.map(a => (
          <span key={a.id} className="asset-tag">
            {a.device_name ? `${a.device_name} (${a.serial_number})` : a.serial_number}
            <button type="button" onClick={() => remove(a.id)} className="asset-tag-remove"><X size={12} /></button>
          </span>
        ))}
      </div>
      <input
        className="form-control"
        placeholder="Search assets to link..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {results.length > 0 && (
        <div className="asset-selector-dropdown">
          {results.map(a => (
            <div key={a.id} className="asset-selector-option" onClick={() => add(a)}>
              <strong>{a.device_name || a.serial_number}</strong>
              {a.device_name && <span className="text-muted text-sm"> · {a.serial_number}</span>}
              <span className="text-muted text-sm"> · {a.asset_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Incidents() {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const canCreate = hasRole('admin', 'full_operator', 'incident_manager');
  const canEditFull = hasRole('admin', 'full_operator', 'incident_manager');
  const isProvider = hasRole('provider');
  const isReadOnly = hasRole('full_viewer', 'asset_manager');

  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    type: searchParams.get('type') || '',
    priority: searchParams.get('priority') || '',
  });

  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyIncident);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25, ...filters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const { data } = await getIncidents(params);
      setIncidents(data.incidents);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const openCreate = () => {
    setForm({ ...emptyIncident });
    setEditMode(false);
    setError('');
    setShowModal(true);
  };

  const openEdit = (incident) => {
    setForm({
      ...incident,
      assigned_to: incident.assigned_to || '',
      asset_ids: incident.assets?.map(a => a.id) || [],
    });
    setEditMode(true);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        assigned_to: form.assigned_to || null,
        asset_ids: form.asset_ids || [],
      };
      if (editMode) {
        await updateIncident(form.id, payload);
      } else {
        await createIncident(payload);
      }
      setShowModal(false);
      fetchIncidents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save incident');
    } finally {
      setSaving(false);
    }
  };

  const setFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  // determine which fields are editable in the modal
  const fieldEditable = (field) => {
    if (isReadOnly) return false;
    if (isProvider) return field === 'status' || field === 'notes';
    return canEditFull;
  };

  const ro = (field) => !fieldEditable(field);

  return (
    <>
      <div className="page-header">
        <h2>Incidents ({total})</h2>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Incident
          </button>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="form-control search-input"
          placeholder="Search number or title..."
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
        />
        <select className="form-control" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {INCIDENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-control" value={filters.type} onChange={e => setFilter('type', e.target.value)}>
          <option value="">All Types</option>
          {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-control" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {INCIDENT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Incident #</th>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted">Loading...</td></tr>
              ) : incidents.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted">No incidents found</td></tr>
              ) : incidents.map(inc => (
                <tr key={inc.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(inc)}>
                  <td><strong>{inc.incident_number}</strong></td>
                  <td>{inc.title}</td>
                  <td><span className={`badge ${incidentTypeBadge(inc.type)}`}>{inc.type}</span></td>
                  <td><span className={`badge ${priorityBadge(inc.priority)}`}>{inc.priority}</span></td>
                  <td><span className={`badge ${incidentStatusBadge(inc.status)}`}>{inc.status}</span></td>
                  <td>{inc.assigned_to_name || '—'}</td>
                  <td className="text-sm">{formatDate(inc.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Page {page} of {totalPages} ({total} incidents)</div>
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

      {showModal && (
        <Modal
          title={editMode ? `Incident: ${form.incident_number}` : 'New Incident'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                {isReadOnly ? 'Close' : 'Cancel'}
              </button>
              {!isReadOnly && (
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : (editMode ? 'Update' : 'Create')}
                </button>
              )}
            </>
          }
        >
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Incident # *</label>
              <input
                className="form-control"
                value={form.incident_number}
                onChange={e => setForm(f => ({ ...f, incident_number: e.target.value }))}
                disabled={ro('incident_number') || (editMode && !canEditFull)}
                required
              />
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input
                className="form-control"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                disabled={ro('title')}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} disabled={ro('type')}>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} disabled={ro('priority')}>
                {INCIDENT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} disabled={ro('status')}>
                {INCIDENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Assigned To</label>
              {ro('assigned_to') ? (
                <input className="form-control" value={form.assigned_to_name || '—'} disabled />
              ) : (
                <select className="form-control" value={form.assigned_to || ''} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value || null }))}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Linked Assets</label>
            <AssetSelector
              selectedIds={form.asset_ids || []}
              onChange={ids => setForm(f => ({ ...f, asset_ids: ids }))}
              readonly={ro('asset_ids')}
            />
          </div>

          <div className="form-group">
            <label>Body</label>
            {ro('body') ? (
              <div className="form-control incident-body-view">{form.body || '—'}</div>
            ) : (
              <textarea
                className="form-control incident-body-edit"
                value={form.body || ''}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder={BODY_PLACEHOLDER}
                rows={6}
              />
            )}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              disabled={ro('description')}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              className="form-control"
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              disabled={ro('notes')}
              rows={3}
            />
          </div>

          {editMode && (
            <div className="text-sm text-muted" style={{ marginTop: 8 }}>
              Created: {formatDateTime(form.created_at)}
              {form.closed_at && <> · Closed: {formatDateTime(form.closed_at)}</>}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
