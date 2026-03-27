import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import { Menu } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AuditLog from './pages/AuditLog';
import ImportExport from './pages/ImportExport';
import Users from './pages/Users';
import Settings from './pages/Settings';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <header className="mobile-header">
        <button className="btn-icon mobile-menu-btn" onClick={() => setNavOpen(true)}>
          <Menu size={22} />
        </button>
        <span className="mobile-title">AssetInventory</span>
        <span />
      </header>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
          <Route path="/export" element={<ProtectedRoute><ImportExport /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
