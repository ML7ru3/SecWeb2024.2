import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import '../styles/Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  const [showLockModal, setShowLockModal] = useState(false);
  const [retryAfter, setRetryAfter] = useState(300);

  const [step, setStep] = useState(1);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const [timer, setTimer] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [data, setData] = useState({
    email: '',
    password: '',
  });

  const [failedAttempts, setFailedAttempts] = useState(0);

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
            setTempToken('');
            setTotpCode('');
            toast.error('Verification code expired. Please login again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [step]);

  // Lock modal countdown
  useEffect(() => {
    if (showLockModal && retryAfter > 0) {
      const countdown = setInterval(() => {
        setRetryAfter((prev) => {
          if (prev <= 1) {
            setShowLockModal(false);
            setFailedAttempts(0); // Reset failed attempts after lockout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdown);
    }
  }, [showLockModal, retryAfter]);

  // Fixed template literal syntax
  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFailedAttempt = (errorMsg = 'Login failed. Please try again.') => {
    setFailedAttempts((prev) => {
      const next = prev + 1;
      if (next >= 4) {
        toast.error(errorMsg);
        setTimeout(() => {
          setShowLockModal(true);
          setRetryAfter(300);
          setStep(1);
          setTempToken('');
          setTotpCode('');
        }, 1500); // Increased delay to 1.5 seconds for toast visibility
        return next;
      }
      toast.error(errorMsg);
      return next;
    });
  };

  const loginUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { email, password } = data;
    const turnstileToken = e.target.querySelector('[name="cf-turnstile-response"]')?.value;

    if (!turnstileToken) {
      toast.error('Please complete the Turnstile challenge');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post('/login', { email, password, turnstileToken }, { withCredentials: true });
      const resData = response.data;

      if (resData.error) {
        handleFailedAttempt(resData.error);
        return;
      } else if (resData.requiresTotp && resData.tempToken) {
        setTempToken(resData.tempToken);
        setStep(2);
        toast.success(resData.message);
        setFailedAttempts(0);
      } else if (resData.message === 'Login successful' && !resData.requiresTotp) {
        const profileRes = await axios.get('/profile', { withCredentials: true });
        setUser(profileRes.data);
        toast.success('Login successful!', );
        setData({ email: '', password: '' });
        setFailedAttempts(0);
        if (profileRes.data.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/gameboard');
        }
      } else {
        handleFailedAttempt('Unexpected response from server');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'An error occurred. Please try again!';
      handleFailedAttempt(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyTotpCode = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await axios.post('/login-mfa', { tempToken, totpCode }, { withCredentials: true });
      const resData = response.data;

      if (resData.error) {
        handleFailedAttempt(resData.error);
        if (resData.error.includes('Too many TOTP attempts') || resData.error.toLowerCase().includes('locked')) {
          setTimeout(() => {
            setShowLockModal(true);
            setStep(1);
            setTempToken('');
            setTotpCode('');
            setRetryAfter(300);
          }, 1500); // Delay modal to ensure toast visibility
        }
        return;
      }

      const profileRes = await axios.get('/profile', { withCredentials: true });
      setUser(profileRes.data);
      toast.success('Login successful!', );
      setData({ email: '', password: '' });
      setTotpCode('');
      setStep(1);
      setFailedAttempts(0);

      if (profileRes.data.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/gameboard');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'TOTP verification failed. Please try again!';
      handleFailedAttempt(errorMsg);
      if (errorMsg.includes('Too many TOTP attempts') || errorMsg.toLowerCase().includes('locked')) {
        setTimeout(() => {
          setShowLockModal(true);
          setStep(1);
          setTempToken('');
          setTotpCode('');
          setRetryAfter(300);
        }, 1500);
      }
    } finally {
      setIsSubmitting(false);
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

          <button type="submit" disabled={isSubmitting}>
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
            onChange={(e) => {
              console.log('TOTP input:', e.target.value);
              setTotpCode(e.target.value);
            }}
            placeholder="Enter 6-digit code"
            maxLength={6}
            autoFocus
            required
          />
          <p className="countdown-text">
            Verification code expires in: <strong>{formatTime(timer)}</strong>
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
              <strong>{formatTime(retryAfter)}</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}