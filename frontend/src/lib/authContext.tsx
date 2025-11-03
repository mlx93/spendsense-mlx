import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: { id: string; email: string; role: string } | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (_email: string, _password: string) => {
    // TODO: Implement login logic
    throw new Error('Not implemented');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
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

