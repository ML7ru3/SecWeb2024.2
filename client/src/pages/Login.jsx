import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import '../styles/Login.css';

export default function Login() {
    const navigate = useNavigate();
    const { user, setUser } = useContext(UserContext);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [retryAfter, setRetryAfter] = useState(0);
    const [showLockModal, setShowLockModal] = useState(false);
    const [step, setStep] = useState(1);
    const [tempToken, setTempToken] = useState('');
    const [totpCode, setTotpCode] = useState('');

    const [timer, setTimer] = useState(300); 
    const [isSubmitting, setIsSubmitting] = useState(false);



    const [data, setData] = useState({
        email: '',
        password: '',
    });

    // Check if user is logged in
    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/gameboard');
            }
        }
    }, [user, navigate]);

    // Timer for TOTP code expiration
    useEffect(() => {
        if (step === 2) {
            setTimer(300); // 5 minutes
            const countdown = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdown);
                        setStep(1);
                        toast.error("Verification code expired. Please login again.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(countdown);
        }
    }, [step]);

    const formatTime = (secs) => {
        const minutes = Math.floor(secs / 60);
        const seconds = secs % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Countdown for rate limit retry
    useEffect(() => {
        if (retryAfter > 0) {
            setIsRateLimited(true);
            setShowLockModal(true);
            const timer = setInterval(() => {
                setRetryAfter((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsRateLimited(false);
                        setShowLockModal(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [retryAfter]);
    
    const loginUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { email, password } = data;
        const turnstileToken = e.target.querySelector('[name="cf-turnstile-response"]')?.value;

        if (!turnstileToken) {
            toast.error("Please complete the Turnstile challenge");
            return;
        }

        try {
            const response = await axios.post('/login', { email, password, turnstileToken });
            const resData = response.data;

            if (resData.error) {
                toast.error(resData.error);
            } else if (resData.message && resData.tempToken) {
                setTempToken(resData.tempToken);
                setStep(2);
                toast.error(resData.message);
            } else if (resData.message && resData.retryAfter) {
                setRetryAfter(resData.retryAfter);
                toast.error(resData.message);
            } else {
                toast.error("Unexpected response from server");
            }
        } catch (error) {
            toast.error('An error occurred. Please try again!');
        } finally {
            setIsSubmitting(false); 
        }
    };

    const verifyTotpCode = async (e) => {
        e.preventDefault();
        setIsSubmitting(true); // Bắt đầu loading

        try {
            const response = await axios.post('/login-mfa', {
                tempToken,
                totpCode,
            });
            const resData = response.data;

            if (resData.error) {
                toast.error(resData.error);
                return;
            }

            if (resData.retryAfter) {
                setRetryAfter(resData.retryAfter);
                setStep(1);
                setTempToken('');
                setTotpCode('');
                toast.error(resData.message || 'Too many failed attempts. Try again later');
                return;
            }

            const profileRes = await axios.get('/profile');
            setUser(profileRes.data);
            toast.success("Login successful!");
            setData({ email: '', password: '' });
            setTotpCode('');
            setStep(1);

            if (profileRes.data.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/gameboard');
            }
        } catch (error) {
            toast.error('TOTP verification failed. Please try again!');
        } finally {
            setIsSubmitting(false); // Kết thúc loading
        }
    };


    return (
        <div className="login-container">
            <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
            
            {step === 1 && (
                <form className="login-form" onSubmit={loginUser}>
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

                    <div
                        className="cf-turnstile"
                        data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                        data-callback="onTurnstileSuccess"
                    ></div>

                    <div>
                        <Link to="/forgot-password" className="forgot-password-link">
                            Forgot Password?
                        </Link>
                    </div>

                    <button type="submit" disabled={isRateLimited || isSubmitting}>
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            )}

            {step === 2 && (
                <form className="login-form" onSubmit={verifyTotpCode}>
                    <h2>Verify Your Identity</h2>
                    <p>A verification code has been sent to your email.</p>

                    <label htmlFor="totpCode">Verification Code</label>
                    <input
                        type="text"
                        id="totpCode"
                        name="totpCode"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        required
                    />
                    <p className="countdown-text">
                        OTP expires in: <strong>{formatTime(timer)}</strong>
                    </p>

                    <div className="form-actions">
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                </form>
            )}

            {showLockModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Account Locked</h3>
                        <p>
                            Too many failed login attempts. Your account is temporarily locked for{' '}
                            <strong>{retryAfter}</strong> seconds.
                        </p>
                        <p>Please wait or reset your password below.</p>
                        <div className="modal-actions">
                            <Link to="/forgot-password" className="reset-link">
                                Reset Password
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}