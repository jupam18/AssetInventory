import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatDate, daysUntil, CHART_COLORS } from '../utils/helpers';
import { Monitor, CheckCircle, Wrench, Archive, AlertTriangle, RefreshCw } from 'lucide-react';

const STATUS_ICONS = {
  'Available': <CheckCircle size={24} />,
  'Assigned': <Monitor size={24} />,
  'In Maintenance': <Wrench size={24} />,
  'Decommissioned': <Archive size={24} />,
};

const STATUS_COLORS = {
  'Available': 'green',
  'Assigned': 'blue',
  'In Maintenance': 'yellow',
  'Decommissioned': 'red',
  'Returned to Client': 'cyan',
};

function ClickableBar({ label, count, max, color, onClick }) {
  return (
    <div
      className="chart-bar-row"
      onClick={onClick}
      style={{ cursor: 'pointer', borderRadius: 6, padding: '4px 2px', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      title={`View all assets: ${label}`}
    >
      <div className="chart-bar-label">{label}</div>
      <div className="chart-bar-track">
        <div className="chart-bar-fill" style={{ width: `${(count / max) * 100}%`, background: color }} />
      </div>
      <div className="chart-bar-value">{count}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.get('/assets/dashboard').then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center mt-4">Loading dashboard...</div>;
  if (!data) return <div className="alert alert-danger">Failed to load dashboard data</div>;

  const maxByType = Math.max(...(data.byType?.map(t => t.count) || [1]), 1);
  const maxByLocation = Math.max(...(data.byLocation?.map(l => l.count) || [1]), 1);
  const maxByClient = Math.max(...(data.byClient?.map(c => c.count) || [1]), 1);

  const goTo = (params) => navigate(`/assets?${new URLSearchParams(params).toString()}`);

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Status stat cards — clickable */}
      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/assets')} title="View all assets">
          <div className="stat-icon blue"><Monitor size={24} /></div>
          <div>
            <div className="stat-value">{data.total}</div>
            <div className="stat-label">Total Assets</div>
          </div>
        </div>
        {data.byStatus?.map(s => (
          <div
            className="stat-card"
            key={s.status}
            style={{ cursor: 'pointer' }}
            onClick={() => goTo({ status: s.status })}
            title={`View ${s.status} assets`}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <div className={`stat-icon ${STATUS_COLORS[s.status] || 'blue'}`}>
              {STATUS_ICONS[s.status] || <Monitor size={24} />}
            </div>
            <div>
              <div className="stat-value">{s.count}</div>
              <div className="stat-label">{s.status}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* By Type */}
        <div className="card">
          <div className="card-header"><h3>Assets by Type</h3></div>
          <div className="card-body">
            <div className="chart-bars">
              {data.byType?.length > 0 ? data.byType.map((t, i) => (
                <ClickableBar
                  key={t.asset_type}
                  label={t.asset_type}
                  count={t.count}
                  max={maxByType}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  onClick={() => goTo({ asset_type: t.asset_type })}
                />
              )) : <p className="text-muted text-center">No assets yet</p>}
            </div>
          </div>
        </div>

        {/* By Location */}
        <div className="card">
          <div className="card-header"><h3>Assets by Location</h3></div>
          <div className="card-body">
            <div className="chart-bars">
              {data.byLocation?.length > 0 ? data.byLocation.map((l, i) => (
                <ClickableBar
                  key={l.location}
                  label={l.location}
                  count={l.count}
                  max={maxByLocation}
                  color={CHART_COLORS[(i + 3) % CHART_COLORS.length]}
                  onClick={() => l.location !== 'Unspecified' ? goTo({ location: l.location }) : navigate('/assets')}
                />
              )) : <p className="text-muted text-center">No assets yet</p>}
            </div>
          </div>
        </div>

        {/* By Client */}
        <div className="card">
          <div className="card-header"><h3>Assets by Client</h3></div>
          <div className="card-body">
            <div className="chart-bars">
              {data.byClient?.length > 0 ? data.byClient.map((c, i) => (
                <ClickableBar
                  key={c.client}
                  label={c.client}
                  count={c.count}
                  max={maxByClient}
                  color={CHART_COLORS[(i + 6) % CHART_COLORS.length]}
                  onClick={() => c.client !== 'Unassigned' ? goTo({ client: c.client }) : navigate('/assets')}
                />
              )) : <p className="text-muted text-center">No assets yet</p>}
            </div>
          </div>
        </div>

        {/* Warranty alerts */}
        <div className="card">
          <div className="card-header">
            <h3><AlertTriangle size={16} style={{ marginRight: 8, color: 'var(--warning)' }} />Warranty Alerts (30 days)</h3>
          </div>
          <div className="card-body">
            {data.warrantyAlerts?.length > 0 ? (
              <ul className="warranty-list">
                {data.warrantyAlerts.map(a => {
                  const days = daysUntil(a.warranty_date);
                  return (
                    <li
                      className="warranty-item"
                      key={a.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/assets?search=${encodeURIComponent(a.serial_number)}`)}
                      title="View this asset"
                    >
                      <div>
                        <strong>{a.device_name || a.serial_number}</strong>
                        {a.device_name && <span className="text-muted text-sm"> ({a.serial_number})</span>}
                        <span className="text-muted text-sm"> — {a.make} {a.model}</span>
                        <span className="text-muted text-sm"> · {a.location || 'No location'}</span>
                      </div>
                      <div>
                        <span className={`warranty-days ${days <= 7 ? 'urgent' : 'warning'}`}>
                          {days <= 0 ? 'Expired' : `${days}d left`}
                        </span>
                        <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{formatDate(a.warranty_date)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted text-center">No upcoming warranty expirations</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
