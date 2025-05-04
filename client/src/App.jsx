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
import React, { useContext, useEffect } from 'react';

// Cập nhật baseURL từ biến môi trường
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true;

function App() {
  return (
    <UserContextProvider>
      <MainApp />
    </UserContextProvider>
  );
}

export default App;

function MainApp() {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "2048";

    // Chỉ redirect nếu truy cập các route yêu cầu đăng nhập
    if (!user && ['/admin/dashboard'].includes(window.location.pathname)) {
      navigate('/login');
    }
    
    // Xử lý lỗi 401
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          setUser(null);
          if (window.location.pathname.startsWith('/admin')) {
            navigate('/login');
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate, setUser, user]);

  // Xử lý đồng bộ logout giữa các tab
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "logout") {
        setUser(null);
        navigate("/login");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [navigate, setUser]);

  return (
    <>
      <Header />
      <Toaster position="bottom-right" toastOptions={{ duration: 2000 }} />
      <Routes>
        <Route path="/" element={<Gameboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/gameboard" element={<Gameboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/admin/dashboard"
          element={
            user?.role === 'admin' ? (
              <AdminDashboard />
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