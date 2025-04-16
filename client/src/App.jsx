import './App.css'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Login from './pages/Login'
import Register from './pages/Register'
import Gameboard from './pages/Gameboard'
import axios from 'axios'
import { Toaster } from 'react-hot-toast'
import { UserContextProvider } from '../context/UserContext.jsx'
import React, { useEffect } from 'react';

axios.defaults.baseURL = 'http://localhost:8000'
axios.defaults.withCredentials = true


function App() {

  useEffect(() => {
    document.title = "2048";
  }, []); 

  return (
    <UserContextProvider>
      <Header />
      <Toaster position='bottom-right' toastOptions={{ duration: 2000 }} />
        <Routes>
          <Route path="/" element={<Gameboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/gameboard" element={<Gameboard />} /> 
        </Routes>
      <Footer />
    </UserContextProvider>
  )
}

export default App
