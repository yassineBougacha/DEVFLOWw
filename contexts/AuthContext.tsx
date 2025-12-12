import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Users for Demo
const MOCK_USERS: Record<string, User> = {
  'admin@devflow.com': {
    id: 'u1',
    name: 'Yassine Admin',
    email: 'admin@devflow.com',
    role: 'ADMIN',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yassine',
  },
  'manager@devflow.com': {
    id: 'u2',
    name: 'Sarah Manager',
    email: 'manager@devflow.com',
    role: 'MANAGER',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  'employee@devflow.com': {
    id: 'u3',
    name: 'Mike Developer',
    email: 'employee@devflow.com',
    role: 'EMPLOYEE',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session storage for persisted session (Unique per tab)
    const storedUser = sessionStorage.getItem('devflow_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        const mockUser = MOCK_USERS[email];
        if (mockUser) {
          setUser(mockUser);
          // Use sessionStorage to allow multiple tabs with different users
          sessionStorage.setItem('devflow_user', JSON.stringify(mockUser));
          resolve();
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 500); // Simulate network delay
    });
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('devflow_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};