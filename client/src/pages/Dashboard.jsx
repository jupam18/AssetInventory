import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate, daysUntil, statusBadge, CHART_COLORS } from '../utils/helpers';
import { Monitor, CheckCircle, Wrench, Archive, AlertTriangle } from 'lucide-react';

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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assets/dashboard').then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-4">Loading dashboard...</div>;
  if (!data) return <div className="alert alert-danger">Failed to load dashboard data</div>;

  const maxByType = Math.max(...(data.byType?.map(t => t.count) || [1]), 1);
  const maxByLocation = Math.max(...(data.byLocation?.map(l => l.count) || [1]), 1);

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Monitor size={24} /></div>
          <div>
            <div className="stat-value">{data.total}</div>
            <div className="stat-label">Total Assets</div>
          </div>
        </div>
        {data.byStatus?.map(s => (
          <div className="stat-card" key={s.status}>
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
        <div className="card">
          <div className="card-header"><h3>Assets by Type</h3></div>
          <div className="card-body">
            <div className="chart-bars">
              {data.byType?.map((t, i) => (
                <div className="chart-bar-row" key={t.asset_type}>
                  <div className="chart-bar-label">{t.asset_type}</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{
                      width: `${(t.count / maxByType) * 100}%`,
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }} />
                  </div>
                  <div className="chart-bar-value">{t.count}</div>
                </div>
              ))}
              {(!data.byType || data.byType.length === 0) && (
                <p className="text-muted text-center">No assets yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Assets by Location</h3></div>
          <div className="card-body">
            <div className="chart-bars">
              {data.byLocation?.map((l, i) => (
                <div className="chart-bar-row" key={l.location}>
                  <div className="chart-bar-label">{l.location}</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{
                      width: `${(l.count / maxByLocation) * 100}%`,
                      background: CHART_COLORS[(i + 3) % CHART_COLORS.length],
                    }} />
                  </div>
                  <div className="chart-bar-value">{l.count}</div>
                </div>
              ))}
              {(!data.byLocation || data.byLocation.length === 0) && (
                <p className="text-muted text-center">No assets yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3><AlertTriangle size={16} style={{ marginRight: 8, color: 'var(--warning)' }} />Warranty Expiration Alerts (30 days)</h3>
          </div>
          <div className="card-body">
            {data.warrantyAlerts?.length > 0 ? (
              <ul className="warranty-list">
                {data.warrantyAlerts.map(a => {
                  const days = daysUntil(a.warranty_date);
                  return (
                    <li className="warranty-item" key={a.id}>
                      <div>
                        <strong>{a.serial_number}</strong> — {a.make} {a.model}
                        <span className="text-muted text-sm"> ({a.location || 'No location'})</span>
                      </div>
                      <div>
                        <span className={`warranty-days ${days <= 7 ? 'urgent' : 'warning'}`}>
                          {days <= 0 ? 'Expired' : `${days} days left`}
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
