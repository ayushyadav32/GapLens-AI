import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { authApi } from '@/lib/api/authApi';
import type { User, LoginCredentials, RegisterData } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<{ user: User; message: string }>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) { setLoading(false); return; }
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const { data } = await authApi.login(credentials);
    sessionStorage.setItem('access_token', data.access);
    sessionStorage.setItem('refresh_token', data.refresh);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData: RegisterData): Promise<{ user: User; message: string }> => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    setUser(null);
    const { data } = await authApi.register(formData);
    return data;
  };

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
