import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Rank from './pages/Rank'
import Home from './pages/Home' 
import axios from 'axios'
import { Toaster } from 'react-hot-toast'
import { UserContextProvider } from '../context/UserContext'
import { useContext } from 'react'
import { UserContext } from '../context/UserContext'

axios.defaults.baseURL = 'http://localhost:8000'
axios.defaults.withCredentials = true 

function RedirectRoot() {
  const { user } = useContext(UserContext);
  return (<Navigate to="/home" />);
}

function App() {
  return (
    <UserContextProvider>
      <Toaster position='bottom-right' toastOptions={{ duration: 2000 }} />
      <Routes>
        <Route path="/" element={<RedirectRoot />} />
        <Route path="/home" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/rank" element={<Rank />} />
        <Route path="/dashboard" element={<Dashboard/>}/>
      </Routes>
    </UserContextProvider>
  )
}

export default App;
