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

axios.defaults.baseURL = 'http://localhost:8000';
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
  }, []);

  // 👇 Thêm đoạn useEffect này để đồng bộ logout giữa các tab
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
