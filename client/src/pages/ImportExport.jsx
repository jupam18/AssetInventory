import { useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Upload, Download, FileSpreadsheet, FileText } from 'lucide-react';

export default function ImportExport() {
  const { hasRole } = useAuth();
  const canImport = hasRole('admin', 'technician');
  const fileRef = useRef();

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exportStatus, setExportStatus] = useState('');

  const handleImport = async () => {
    const file = fileRef.current?.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await api.post('/assets/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
      fileRef.current.value = '';
    } catch (err) {
      setImportResult({ message: err.response?.data?.error || 'Import failed', errors: [] });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format, type = 'assets') => {
    setExportStatus(`Exporting ${type} as ${format}...`);
    try {
      let url = type === 'audit' ? '/assets/export/audit' : `/assets/export/${format}`;
      const { data, headers } = await api.get(url, { responseType: 'blob' });

      const blob = new Blob([data], { type: headers['content-type'] });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${ext}`;
      link.click();
      URL.revokeObjectURL(link.href);
      setExportStatus('Export completed!');
    } catch {
      setExportStatus('Export failed');
    }
    setTimeout(() => setExportStatus(''), 3000);
  };

  return (
    <>
      <div className="page-header">
        <h2>Import / Export</h2>
      </div>

      <div className="dashboard-grid">
        {canImport && (
          <div className="card">
            <div className="card-header"><h3><Upload size={16} style={{ marginRight: 8 }} />CSV Import</h3></div>
            <div className="card-body">
              <p className="text-sm text-muted mb-4">
                Upload a CSV file with columns: device_name, serial_number, asset_type, make, model, location, client, assigned_to, status, warranty_date, incident_number, commentary
              </p>
              <div className="form-group">
                <input type="file" accept=".csv" ref={fileRef} className="form-control" />
              </div>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                <Upload size={16} /> {importing ? 'Importing...' : 'Import CSV'}
              </button>

              {importResult && (
                <div className={`alert ${importResult.created > 0 ? 'alert-success' : 'alert-warning'}`} style={{ marginTop: 16 }}>
                  <div>
                    <strong>{importResult.message}</strong>
                    {importResult.errors?.length > 0 && (
                      <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                        {importResult.errors.slice(0, 10).map((e, i) => (
                          <li key={i} className="text-sm">Row {e.row}: {e.error}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li className="text-sm">...and {importResult.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 20, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                <strong className="text-sm">CSV Template:</strong>
                <pre className="text-sm" style={{ marginTop: 8, overflow: 'auto' }}>
{`device_name,serial_number,asset_type,make,model,location,client,assigned_to,status,warranty_date,incident_number,commentary
John's Laptop,SN-001,Laptop,Dell,Latitude 5520,Office A,Acme Corp,John Doe,Assigned,2025-12-31,,Company laptop
,SN-002,Server,HP,ProLiant DL380,Data Center,,,Available,2026-06-15,INC-001,Production server`}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><h3><Download size={16} style={{ marginRight: 8 }} />Export Data</h3></div>
          <div className="card-body">
            <p className="text-sm text-muted mb-4">Download assets or audit log data in your preferred format.</p>

            <h4 style={{ marginBottom: 12 }}>Assets</h4>
            <div className="btn-group mb-4">
              <button className="btn btn-outline" onClick={() => handleExport('csv')}>
                <FileText size={16} /> Export CSV
              </button>
              <button className="btn btn-outline" onClick={() => handleExport('excel')}>
                <FileSpreadsheet size={16} /> Export Excel
              </button>
            </div>

            <h4 style={{ marginBottom: 12, marginTop: 20 }}>Audit Log</h4>
            <div className="btn-group">
              <button className="btn btn-outline" onClick={() => handleExport('csv', 'audit')}>
                <FileText size={16} /> Export Audit CSV
              </button>
            </div>

            {exportStatus && (
              <div className="alert alert-info" style={{ marginTop: 16 }}>{exportStatus}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
