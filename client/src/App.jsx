import './App.css';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import React, { useContext, useEffect, useState, useCallback } from 'react';
import { debounce, throttle } from 'lodash';

// Cấu hình Axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true;

// Giới hạn request đồng thời
const MAX_CONCURRENT_REQUESTS = 5;
let pendingRequests = 0;

// Interceptor quản lý request queue
axios.interceptors.request.use(config => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (pendingRequests < MAX_CONCURRENT_REQUESTS) {
        pendingRequests++;
        clearInterval(interval);
        resolve(config);
      }
    }, 100);
  });
});

axios.interceptors.response.use(
  response => {
    pendingRequests--;
    return response;
  },
  error => {
    pendingRequests--;
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
  const [loading, setLoading] = useState(false);
  const [lastApiCallTime, setLastApiCallTime] = useState(0);

  // 1. Debounce navigation
  const debouncedNavigate = useCallback(
    debounce((path) => navigate(path), 300),
    [navigate]
  );

  // 2. Safe API caller với rate limiting
  const safeApiCall = useCallback(
    async (apiFunction, ...args) => {
      const now = Date.now();
      const timeDiff = now - lastApiCallTime;

      // Giới hạn 2 request/giây
      if (timeDiff < 500) {
        console.warn('[SECURITY] Request too fast! Delaying...');
        await new Promise(resolve => setTimeout(resolve, 500 - timeDiff));
        return safeApiCall(apiFunction, ...args);
      }

      setLastApiCallTime(now);
      setLoading(true);

      try {
        return await apiFunction(...args);
      } finally {
        setLoading(false);
      }
    },
    [lastApiCallTime]
  );

  // 3. Xử lý lỗi với retry hợp lý
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        // Xử lý lỗi 401
        if (error.response?.status === 401) {
          setUser(null);
          if (window.location.pathname.startsWith('/admin')) {
            debouncedNavigate('/login');
          }
        }
        
        // Tự động retry với exponential backoff
        if (error.config && error.response?.status >= 500) {
          const retryCount = error.config.retryCount || 0;
          if (retryCount < 2) { // Tối đa retry 2 lần
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

    return () => axios.interceptors.response.eject(interceptor);
  }, [setUser, debouncedNavigate]);

  // 4. Bảo vệ route
  useEffect(() => {
    if (!user && ['/admin/dashboard'].includes(window.location.pathname)) {
      debouncedNavigate('/login');
    }
  }, [user, debouncedNavigate]);

  // 5. Throttle event handlers
  const throttledStorageHandler = useCallback(
    throttle(event => {
      if (event.key === "logout") {
        setUser(null);
        debouncedNavigate("/login");
      }
    }, 1000),
    [setUser, debouncedNavigate]
  );

  useEffect(() => {
    window.addEventListener("storage", throttledStorageHandler);
    return () => window.removeEventListener("storage", throttledStorageHandler);
  }, [throttledStorageHandler]);

  // 6. Component bảo vệ tải quá nhiều
  const ProtectedComponent = ({ children, maxRenderTime = 5000 }) => {
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => setShouldRender(false), maxRenderTime);
      return () => clearTimeout(timer);
    }, [maxRenderTime]);

    return shouldRender ? children : null;
  };

  return (
    <>
      <Header />
      <Toaster position="bottom-right" toastOptions={{ duration: 2000 }} />
      <Routes>
        <Route path="/" element={
          <ProtectedComponent>
            <Gameboard safeApiCall={safeApiCall} />
          </ProtectedComponent>
        } />
        <Route path="/gameboard" element={
          <ProtectedComponent>
            <Gameboard safeApiCall={safeApiCall} />
          </ProtectedComponent>
        } />
        <Route path="/register" element={<Register safeApiCall={safeApiCall} />} />
        <Route path="/login" element={<Login safeApiCall={safeApiCall} />} />
        <Route path="/forgot-password" element={<ForgotPassword safeApiCall={safeApiCall} />} />
        <Route
          path="/admin/dashboard"
          element={
            user?.role === 'admin' ? (
              <ProtectedComponent>
                <AdminDashboard safeApiCall={safeApiCall} />
              </ProtectedComponent>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
      <Footer />
    </>
  );
}

export default App;