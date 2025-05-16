import './App.css';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Login from './pages/Login';
import Register from './pages/Register';
import Gameboard from './pages/Gameboard';
import ForgotPassword from './pages/ForgotPassword.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import { UserContextProvider, UserContext } from '../context/UserContext.jsx';
import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { debounce, throttle } from 'lodash';

axios.defaults.baseURL = 'https://secweb2024-2.onrender.com';
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000; // 10 giây

// Giới hạn request đồng thời
const MAX_CONCURRENT_REQUESTS = 5;
let pendingRequests = 0;

// Interceptor quản lý request queue
axios.interceptors.request.use(config => {
  console.log('[DEBUG] Sending request:', config.url);
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (pendingRequests < MAX_CONCURRENT_REQUESTS) {
        pendingRequests++;
        clearInterval(interval);
        resolve(config);
      }
    }, 200);
  });
});

// Interceptor xử lý response và lỗi token hết hạn
axios.interceptors.response.use(
  response => {
    pendingRequests--;
    return response;
  },
  async error => {
    pendingRequests--;
    console.error('[DEBUG] Response error:', error.response?.status, error.response?.data);

    // Xử lý lỗi 401 (Unauthorized) và 403 (Token expired)
    if (error.response?.status === 401 || error.response?.status === 403) {
      const { setUser, debouncedNavigate } = error.config.context || {};
      if (setUser && debouncedNavigate && window.location.pathname !== '/login') {
        setUser(null);
        const redirectTo = window.location.pathname + window.location.search;
        debouncedNavigate(`/login?redirect=${encodeURIComponent(redirectTo)}`);
        import('react-hot-toast').then(toast => {
          toast.default.error('Session expired. Please log in again.');
        });
      }
      return Promise.reject(error);
    }

    // Retry với exponential backoff cho lỗi 5xx
    if (error.config && error.response?.status >= 500) {
      const retryCount = error.config.retryCount || 0;
      if (retryCount < 2) {
        const delay = 1000 * (retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return axios({
          ...error.config,
          retryCount: retryCount + 1
        });
      }
    }

    return Promise.reject(error);
  }
);

function App() {
  return (
    <UserContextProvider>
      <MainApp />
    </UserContextProvider>
  );
}

function MainApp() {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [lastApiCallTime, setLastApiCallTime] = useState(0);

  // Debounce navigation
  const debouncedNavigate = useCallback(
    debounce((path) => navigate(path), 300),
    [navigate]
  );

  // Memoize safeApiCall để ổn định tham chiếu
  const safeApiCall = useMemo(() => {
    const call = async (apiFunction, ...args) => {
      const now = Date.now();
      const timeDiff = now - lastApiCallTime;

      // Giới hạn 2 request/giây
      if (timeDiff < 500) {
        console.warn('[SECURITY] Request too fast! Delaying...');
        await new Promise(resolve => setTimeout(resolve, 500 - timeDiff));
        return call(apiFunction, ...args);
      }

      setLastApiCallTime(now);
      setLoading(true);

      try {
        return await apiFunction({
          ...args[0],
          context: { setUser, debouncedNavigate }
        });
      } finally {
        setLoading(false);
      }
    };
    return call;
  }, [lastApiCallTime, setUser, debouncedNavigate]);

  // Kiểm tra user định kỳ (chỉ cho route yêu cầu xác thực)
  useEffect(() => {
    const protectedRoutes = ['/gameboard', '/admin/dashboard'];
    const isProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));

    if (!isProtectedRoute || !user) return;

    const verifyUser = async () => {
      try {
        const response = await safeApiCall(axios.get, '/profile');
        console.log('[DEBUG] Verify user:', response.data);
        setUser(response.data);
      } catch (error) {
        console.error('[DEBUG] Verify user failed:', error.response?.status, error.response?.data);
      }
    };

    verifyUser();
    const interval = setInterval(verifyUser, 300000); // Kiểm tra mỗi 5 phút
    return () => clearInterval(interval);
  }, [user, location.pathname]); // Loại safeApiCall khỏi dependencies

  // Throttle event handlers
  const throttledStorageHandler = useCallback(
    throttle(event => {
      console.log('[DEBUG] Storage event:', event.key);
      if (event.key === 'logout' && window.location.pathname !== '/login') {
        setUser(null);
        debouncedNavigate('/login');
      }
    }, 1000),
    [setUser, debouncedNavigate]
  );

  useEffect(() => {
    window.addEventListener('storage', throttledStorageHandler);
    return () => window.removeEventListener('storage', throttledStorageHandler);
  }, [throttledStorageHandler]);

  // Protected route component
  const ProtectedRoute = ({ children, requireAdmin = false }) => {
    console.log('[DEBUG] ProtectedRoute rendered, user:', user);
    if (!user) {
      const redirectTo = location.pathname + location.search;
      return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} />;
    }
    if (requireAdmin && user.role !== 'admin') {
      return <Navigate to="/gameboard" />;
    }
    return children;
  };

  return (
    <>
      <Header />
      <Toaster position="bottom-right" toastOptions={{ duration: 2000 }} />
      {loading && <div>Loading...</div>}
      <Routes>
        <Route path="/" element={<Gameboard safeApiCall={safeApiCall} />} />
        <Route
          path="/gameboard"
          element={
            <ProtectedRoute>
              <Gameboard safeApiCall={safeApiCall} />
            </ProtectedRoute>
          }
        />
        <Route path="/register" element={<Register safeApiCall={safeApiCall} />} />
        <Route path="/login" element={<Login safeApiCall={safeApiCall} />} />
        <Route path="/forgot-password" element={<ForgotPassword safeApiCall={safeApiCall} />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard safeApiCall={safeApiCall} />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Footer />
    </>
  );
}

export default App;