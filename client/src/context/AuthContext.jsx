import { createContext, useContext, useState, useEffect } from 'react';
import { fetchWithAuth, login as apiLogin, logout as apiLogout } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage on mount
    const storedUser = localStorage.getItem('fabric_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Verify token in background
        fetchWithAuth('/auth/me')
          .then(data => setUser(data.user))
          .catch(() => {
            setUser(null);
          });
      } catch (e) {
        setUser(null);
      }
    }
    setLoading(false);

    // Listen for unauthorized events from api.js
    const handleUnauthorized = () => setUser(null);
    const handleLogout = () => setUser(null);
    
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const login = async (name, pin) => {
    const data = await apiLogin(name, pin);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
