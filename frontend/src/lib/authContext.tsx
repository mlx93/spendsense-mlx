import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import api from './apiClient';

// Simple JWT decoder (we only need the payload, no verification needed on client)
function decodeJWT(token: string): { userId: string; role: string; consentStatus: boolean } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return {
      userId: decoded.userId,
      role: decoded.role,
      consentStatus: decoded.consentStatus,
    };
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

interface AuthContextType {
  user: { id: string; email: string; role: string; consentStatus: boolean } | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateToken: (token: string, user: { id: string; email: string; role: string; consentStatus: boolean }) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; role: string; consentStatus: boolean } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount and decode to get user info
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      const decoded = decodeJWT(storedToken);
      if (decoded) {
        // We need to fetch user email from backend or store it in token
        // For now, we'll decode what we can from the token
        // The login response includes email, so we should store it in localStorage too
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser({ ...userData, consentStatus: decoded.consentStatus });
          } catch (e) {
            // If stored user is invalid, just use decoded data
            setUser({
              id: decoded.userId,
              email: '', // Will be updated on next login
              role: decoded.role,
              consentStatus: decoded.consentStatus,
            });
          }
        } else {
          // Decode what we can from token, but we need email from localStorage or backend
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              setUser({ ...userData, consentStatus: decoded.consentStatus });
            } catch (e) {
              setUser({
                id: decoded.userId,
                email: '', // Will be updated on next login
                role: decoded.role,
                consentStatus: decoded.consentStatus,
              });
            }
          } else {
            setUser({
              id: decoded.userId,
              email: '', // Will be updated on next login
              role: decoded.role,
              consentStatus: decoded.consentStatus,
            });
          }
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: newToken } = response.data;
      setUser(userData);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData)); // Store user data for persistence
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await api.post('/users', { email, password });
      const { user: userData, token: newToken } = response.data;
      setUser(userData);
      setToken(newToken);
      localStorage.setItem('token', newToken);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateToken = (newToken: string, newUser: { id: string; email: string; role: string; consentStatus: boolean }) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser)); // Store user data for persistence
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
