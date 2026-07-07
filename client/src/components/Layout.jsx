import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Icon({ name }) {
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />,
    scissors: <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />,
    plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
    cog: <><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    users: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />,
    tag: <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />,
    list: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />,
    logout: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />,
    store: <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />,
  };

  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      {icons[name] || null}
    </svg>
  );
}

function SidebarLink({ to, icon, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
    >
      <Icon name={icon} />
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <header className="top-nav">
        <Link to="/" className="top-nav-brand">
          🧵 <span style={{ color: 'var(--accent)' }}>Fabric</span>Tracker
        </Link>

        <div className="top-nav-right">
          <span className="top-nav-user">{user?.name}</span>
          {user?.role === 'admin' && (
            <span className="status-badge status-reserved" style={{ fontSize: '10px' }}>Admin</span>
          )}
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Log out">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <Icon name="logout" />
            </svg>
          </button>
        </div>
      </header>

      <div className="app-body">
        {/* Desktop Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section-label">Stock</div>
          <SidebarLink to="/" icon="home" end>Dashboard</SidebarLink>
          <SidebarLink to="/accessories" icon="scissors">Accessories</SidebarLink>

          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Actions</div>
          <SidebarLink to="/stock/new" icon="plus">New Fabric Entry</SidebarLink>
          <SidebarLink to="/accessories/new" icon="plus">New Accessory</SidebarLink>

          {user?.role === 'admin' && (
            <>
              <div className="sidebar-divider" />
              <div className="sidebar-section-label">Admin</div>
              <SidebarLink to="/admin/masters" icon="list">Fabric Masters</SidebarLink>
              <SidebarLink to="/admin/accessory-masters" icon="list">Accessory Masters</SidebarLink>
              <SidebarLink to="/admin/vendors" icon="store">Vendors</SidebarLink>
              <SidebarLink to="/admin/reference" icon="tag">Reference Data</SidebarLink>
              <SidebarLink to="/admin/users" icon="users">Users</SidebarLink>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Icon name="home" />
          <span>Fabric</span>
        </NavLink>
        <NavLink to="/accessories" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Icon name="scissors" />
          <span>Accessories</span>
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/admin/masters" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <Icon name="list" />
            <span>Masters</span>
          </NavLink>
        )}
        <NavLink to={user?.role === 'admin' ? '/admin/reference' : '/'} className={({ isActive }) => `bottom-nav-item ${isActive && user?.role === 'admin' ? 'active' : ''}`}>
          <Icon name="cog" />
          <span>{user?.role === 'admin' ? 'Admin' : 'More'}</span>
        </NavLink>
      </nav>

      {/* FAB — Quick Add (mobile) */}
      <button className="fab" onClick={() => setShowQuickAdd(true)} aria-label="Quick Add">
        +
      </button>

      {/* Quick Add Bottom Sheet */}
      {showQuickAdd && (
        <div className="bottom-sheet-overlay" onClick={() => setShowQuickAdd(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-title">What are you logging?</div>
            <div className="quick-add-options">
              <Link
                to="/stock/new"
                className="quick-add-option"
                onClick={() => setShowQuickAdd(false)}
              >
                <span className="quick-add-option-icon">🧵</span>
                <span className="quick-add-option-label">Fabric Stock</span>
                <span className="quick-add-option-sub">Leftover fabric from orders</span>
              </Link>
              <Link
                to="/accessories/new"
                className="quick-add-option"
                onClick={() => setShowQuickAdd(false)}
              >
                <span className="quick-add-option-icon">🔘</span>
                <span className="quick-add-option-label">Accessory</span>
                <span className="quick-add-option-sub">Buttons, zippers, elastic…</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
