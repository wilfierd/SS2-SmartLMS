
// File: src/context/AuthContext.js
import { createContext } from 'react';

const AuthContext = createContext({
  auth: {
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true
  },
  login: () => {},
  logout: () => {},
  updateUser: () => {}
});

export default AuthContext;