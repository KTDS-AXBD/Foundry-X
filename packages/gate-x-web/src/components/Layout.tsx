import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/pipelines', label: 'Pipelines', end: false },
  { to: '/reports', label: 'Reports', end: false },
  { to: '/settings', label: 'Settings', end: false },
];

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: '#1a1a2e',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '20px 16px',
            fontSize: 20,
            fontWeight: 700,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            letterSpacing: 1,
          }}
        >
          Gate-X
        </div>
        <nav style={{ padding: '12px 0' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 20px',
                color: isActive ? '#7c83fd' : '#ccc',
                textDecoration: 'none',
                background: isActive ? 'rgba(124,131,253,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #7c83fd' : '3px solid transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          style={{
            height: 56,
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            fontSize: 16,
            fontWeight: 600,
            color: '#111',
          }}
        >
          Gate-X Dashboard
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '24px', background: '#f9fafb' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
