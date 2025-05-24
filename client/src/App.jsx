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

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true;
axios.defaults.timeout = 10000;

// Giới hạn request đồng thời
const MAX_CONCURRENT_REQUESTS = 10;
let pendingRequests = 0;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

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

// Interceptor xử lý response và refresh token
axios.interceptors.response.use(
    response => {
        pendingRequests--;
        return response;
    },
    async error => {
        pendingRequests--;
        console.error('[DEBUG] Response error:', error.response?.status, error.response?.data);

        const originalRequest = error.config;
        const { setUser, debouncedNavigate } = originalRequest.context || {};

        // Xử lý lỗi 401 (Unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Thêm yêu cầu vào queue nếu đang refresh
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => axios(originalRequest));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Thử gọi /refresh-token với retry logic
                let retries = 3;
                let refreshError = null;
                while (retries > 0) {
                    try {
                        await axios.post('/refresh-token', {}, { context: { setUser, debouncedNavigate } });
                        break;
                    } catch (err) {
                        refreshError = err;
                        retries--;
                        if (retries === 0) throw refreshError;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                // Cập nhật user sau khi refresh thành công
                try {
                    const profileResponse = await axios.get('/profile', { context: { setUser, debouncedNavigate } });
                    setUser(profileResponse.data);
                } catch (profileError) {
                    console.error('[DEBUG] Failed to refresh user profile:', profileError);
                }

                isRefreshing = false;
                processQueue(null);
                return axios(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                processQueue(refreshError);

                if (setUser && debouncedNavigate && window.location.pathname !== '/login') {
                    setUser(null);
                    const redirectTo = window.location.pathname + window.location.search;
                    debouncedNavigate(`/login?redirect=${encodeURIComponent(redirectTo)}`);
                    import('react-hot-toast').then(toast => {
                        toast.default.error('Session expired. Please log in again.');
                    });
                }
                return Promise.reject(refreshError);
            }
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
            if (timeDiff < 200) {
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
        const protectedRoutes = ['/admin/dashboard'];
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
        const interval = setInterval(verifyUser, 600000); // Kiểm tra mỗi 10 phút
        return () => clearInterval(interval);
    }, [user, location.pathname]);

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
        console.log('[DEBUG] ProtectedRoute - user:', user, 'path:', location.pathname);
        if (!user) {
            const redirectTo = location.pathname + location.search;
            return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
        }
        if (requireAdmin && user.role !== 'admin') {
            return <Navigate to="/gameboard" replace />;
        }
        return children;
    };

    return (
        <>
            <Header />
            <Toaster position="bottom-right" toastOptions={{ duration: 2000 }} />
            {loading && <div>Loading...</div>}
            <Routes>
                <Route path="/" element={<Navigate to="/gameboard" replace />} />
                <Route path="/gameboard" element={<Gameboard safeApiCall={safeApiCall} />} />
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