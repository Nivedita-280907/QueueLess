import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  Activity, 
  LogOut, 
  User,
  Stethoscope,
  AlertCircle,
  BarChart3,
  Clock
} from 'lucide-react';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getNavItems = () => {
    if (user?.role === 'patient') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      ];
    } else if (user?.role === 'staff') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/staff/dashboard' },
        { icon: Users, label: 'Doctor Sessions', path: '/staff/dashboard#doctors' },
        { icon: AlertCircle, label: 'Emergency', path: '/staff/dashboard#emergency' },
      ];
    } else if (user?.role === 'admin') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: UserCog, label: 'Manage Doctors', path: '/admin/dashboard#doctors' },
        { icon: BarChart3, label: 'Analytics', path: '/admin/dashboard#analytics' },
      ];
    } else if (user?.role === 'doctor') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/doctor/dashboard' },
        { icon: Activity, label: 'Current Patient', path: '/doctor/dashboard#current' },
        { icon: Users, label: 'My Queue', path: '/doctor/dashboard#queue' },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* User Profile Section */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">© 2024 QueueLess</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
