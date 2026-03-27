import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Monitor, ClipboardList, FileText, Users, Settings, LogOut } from 'lucide-react';

export default function Sidebar({ open, onClose }) {
  const { user, logout, hasRole } = useAuth();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-header">
          <h1>AssetInventory</h1>
          <p>IT Asset Management</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end onClick={handleNavClick}>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/assets" onClick={handleNavClick}>
            <Monitor size={18} /> Assets
          </NavLink>
          <NavLink to="/audit" onClick={handleNavClick}>
            <ClipboardList size={18} /> Audit Log
          </NavLink>
          <NavLink to="/export" onClick={handleNavClick}>
            <FileText size={18} /> Import / Export
          </NavLink>
          {hasRole('admin') && (
            <NavLink to="/users" onClick={handleNavClick}>
              <Users size={18} /> User Management
            </NavLink>
          )}
          {hasRole('admin') && (
            <NavLink to="/settings" onClick={handleNavClick}>
              <Settings size={18} /> Settings
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <p>{user?.full_name}</p>
              <span>{user?.role}</span>
            </div>
            <button className="btn-icon" onClick={logout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
