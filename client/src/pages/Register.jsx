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

    // Check if user is logged in
    useEffect(() => {
        if (user) {
            navigate('/gameboard');
        }
    }, [user, navigate]);

    const RegisterUser = async (e) => {
        e.preventDefault();
        const { name, email, password } = data;
        // Get Turnstile token from the widget
        const turnstileToken = e.target.querySelector('[name="cf-turnstile-response"]')?.value;
        if (!turnstileToken) {
            toast.error("Please complete the Turnstile challenge");
            return;
        }
        const lastSession = JSON.parse(localStorage.getItem('guestGameState'));
        try {
            const { data } = await axios.post('/register', { name, email, password, turnstileToken, lastSession});
            if (data.error) {
                toast.error(data.error);
            } else {
                setData({ name: '', email: '', password: '' });
                toast.success('Registration successful!');
                navigate('/login');
            }
        } catch (error) {
            toast.error('An error occurred. Please try again!');
            console.log(error);
        }
    };

    return (
        <div className="register-container">
            {/* Load Turnstile script */}
            <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
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

                {/* Add Turnstile widget */}
                <div
                    className="cf-turnstile"
                    data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    data-callback="onTurnstileSuccess"
                ></div>

                <button type="submit">Register</button>
            </form>
        </div>
    );
}