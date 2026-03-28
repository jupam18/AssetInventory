import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { formatDateTime } from '../utils/helpers';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '', action: '', performed_by: '', field_changed: '', comment: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50, ...filters };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const { data } = await api.get('/assets/audit', { params });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const setFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  const ACTION_COLORS = {
    'CREATED': 'badge-available',
    'STATUS_CHANGE': 'badge-assigned',
    'ASSIGNMENT_CHANGE': 'badge-maintenance',
    'LOCATION_CHANGE': 'badge-returned',
    'FIELD_UPDATE': 'badge-decommissioned',
    'DELETED': 'badge-maintenance',
  };

  return (
    <>
      <div className="page-header">
        <h2>Audit Log ({total})</h2>
      </div>

      <div className="filters-bar">
        <input className="form-control search-input" placeholder="Search reference / values..."
          value={filters.search} onChange={e => setFilter('search', e.target.value)} />
        <select className="form-control" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
          <option value="">All Actions</option>
          <option value="CREATED">Created</option>
          <option value="STATUS_CHANGE">Status Change</option>
          <option value="ASSIGNMENT_CHANGE">Assignment Change</option>
          <option value="LOCATION_CHANGE">Location Change</option>
          <option value="CLIENT_CHANGE">Client Change</option>
          <option value="INCIDENT_UPDATE">Incident Update</option>
          <option value="FIELD_UPDATE">Field Update</option>
          <option value="DELETED">Deleted</option>
        </select>
        <input className="form-control" placeholder="Field changed..."
          value={filters.field_changed} onChange={e => setFilter('field_changed', e.target.value)} />
        <input className="form-control" placeholder="Performed by..."
          value={filters.performed_by} onChange={e => setFilter('performed_by', e.target.value)} />
        <input className="form-control" placeholder="Comment..."
          value={filters.comment} onChange={e => setFilter('comment', e.target.value)} />
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Reference</th>
                <th>Action</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Performed By</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center text-muted">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted">No audit records found</td></tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td className="text-sm">{formatDateTime(l.created_at)}</td>
                  <td><strong>{l.incident_number || l.serial_number}</strong></td>
                  <td><span className={`badge ${ACTION_COLORS[l.action] || ''}`}>{l.action}</span></td>
                  <td>{l.field_changed || '—'}</td>
                  <td className="text-sm" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.old_value || '—'}</td>
                  <td className="text-sm" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.new_value || '—'}</td>
                  <td>{l.performed_by}</td>
                  <td className="text-sm">{l.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Page {page} of {totalPages} ({total} records)</div>
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
    </>
  );
}
