import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import '../styles/Login.css';

export default function Login() {
    const navigate = useNavigate();
    const { user, setUser } = useContext(UserContext);

    const [data, setData] = useState({
        email: '',
        password: '',
    });

    // check out login if user is logged in
    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/gameboard');
            }
        }
    }, [user, navigate]);

    const LoginUser = async (e) => {
        e.preventDefault();
        const { email, password } = data;
        try {
            const res = await axios.post('/login', { email, password });

            if (res.data.error) {
                toast.error(res.data.error);
            } else {
                const profileRes = await axios.get('/profile');
                setUser(profileRes.data);
                toast.success("Login successful!");
                setData({ email: '', password: '' });

                // navigate based on role
                if (profileRes.data.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/gameboard');
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Login failed. Please try again!");
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={LoginUser}>
                <h2>Login</h2>

                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={data.email}
                    onChange={(e) => setData({ ...data, email: e.target.value })}
                    required
                />

                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    value={data.password}
                    onChange={(e) => setData({ ...data, password: e.target.value })}
                    required
                />

                <div>
                    <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
                </div>

                <button type="submit">Login</button>
            </form>
        </div>
    );
}