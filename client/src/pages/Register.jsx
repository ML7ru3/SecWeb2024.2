import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import '../styles/Register.css';

export default function Register() {
    const navigate = useNavigate();
    const { user } = useContext(UserContext); 

    const [data, setData] = useState({
        name: '',
        email: '',
        password: '',
    });

    // check out login if user is logged in
    useEffect(() => {
        if (user) {
            navigate('/gameboard');
        }
    }, [user, navigate]);

    const RegisterUser = async (e) => {
        e.preventDefault();
        const { name, email, password } = data;
        try {
            const { data } = await axios.post('/register', { name, email, password });
            if (res.data.error || res.data.message) {
                const errorMsg = res.data.error || res.data.message;
                toast.error(errorMsg);
            } else {
                setData({ name: '', email: '', password: '' });
                toast.success('Registration successful!');
                navigate('/login');
            }
        } catch (error) {
            console.error(error);
            const errorMsg =
                error.response?.data?.error ||
                error.response?.data?.message;
            toast.error(errorMsg);
        }
    };

    return (
        <div className="register-container">
            <form className="register-form" onSubmit={RegisterUser}>
                <h2>Register</h2>

                <label htmlFor="username">Username</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    required
                />

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

                <button type="submit">Register</button>
            </form>
        </div>
    );
}
