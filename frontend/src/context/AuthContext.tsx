import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  quickLogin: (
    demoRole: 'Admin' | 'Receptionist' | 'Staff-Alex' | 'Staff-Ben' | 'Staff-Usman' | 'Staff-Elena'
  ) => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
  isReceptionist: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bitnox_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      api.auth
        .me()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('bitnox_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('bitnox_token', res.token);
    setToken(res.token);
    setUser(res.user as User);
    return res.user as User;
  };

  const quickLogin = async (
    demoRole: 'Admin' | 'Receptionist' | 'Staff-Alex' | 'Staff-Ben' | 'Staff-Usman' | 'Staff-Elena'
  ): Promise<User> => {
    let email = 'admin@bitnox.com';
    let password = 'admin123';

    if (demoRole === 'Receptionist') {
      email = 'receptionist@bitnox.com';
      password = 'recep123';
    } else if (demoRole === 'Staff-Alex' || demoRole === 'Staff-Ben') {
      email = 'ben.sam@bitnox.com';
      password = 'staff123';
      try {
        return await login(email, password);
      } catch {
        email = 'alex.vance@bitnox.com';
      }
    } else if (demoRole === 'Staff-Usman') {
      email = 'usman.oyeboade@bitnox.com';
      password = 'staff123';
    } else if (demoRole === 'Staff-Elena') {
      email = 'elena.gomez@bitnox.com';
      password = 'staff123';
    }

    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('bitnox_token');
    setToken(null);
    setUser(null);
  };

  const role = user?.role || null;
  const isAdmin = role === 'Admin';
  const isReceptionist = role === 'Receptionist';
  const isStaff = role === 'Staff';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        login,
        quickLogin,
        logout,
        isAdmin,
        isReceptionist,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
