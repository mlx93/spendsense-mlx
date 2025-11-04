import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import ChatSidebar from './Chat/ChatSidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) => {
    const baseClass = "inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors";
    if (isActive(path)) {
      return `${baseClass} bg-blue-600 text-white`;
    }
    return `${baseClass} text-gray-600 hover:bg-gray-100 hover:text-gray-900`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center px-2 py-2 text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                SpendSense
              </Link>
              {user && (
                <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                  {user.role !== 'operator' && (
                    <Link
                      to="/"
                      className={navLinkClass('/')}
                    >
                      Dashboard
                    </Link>
                  )}
                  <Link
                    to="/insights"
                    className={navLinkClass('/insights')}
                  >
                    Insights
                  </Link>
                  <Link
                    to="/library"
                    className={navLinkClass('/library')}
                  >
                    Library
                  </Link>
                  <Link
                    to="/settings"
                    className={navLinkClass('/settings')}
                  >
                    Settings
                  </Link>
                  {user.role === 'operator' && (
                    <Link
                      to="/operator"
                      className={navLinkClass('/operator')}
                    >
                      Operator
                    </Link>
                  )}
                </div>
              )}
            </div>
            {user && (
              <div className="flex items-center">
                <span className="text-gray-700 text-sm mr-4">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
      <ChatSidebar />
    </div>
  );
}

