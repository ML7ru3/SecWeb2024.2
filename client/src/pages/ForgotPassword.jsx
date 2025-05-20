import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ForgotPassword.css';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const navigate = useNavigate();

  // Countdown effect
  useEffect(() => {
    let countdown;
    if (step === 2 && timer > 0) {
      countdown = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(countdown);
  }, [step, timer]);

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInfoMessage('');

    try {
      const response = await axios.post('/forgot-password', { email });
      toast.success(response.data.message);
      setStep(2);
      setTimer(5 * 60);
      setCanResend(false);
      // clear old inputs
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (timer <= 0) {
      toast.error("OTP has expired. Please request a new one.");
      setStep(1);
      setTimer(0);
      setCanResend(true);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/reset-password', {
        email,
        otp,
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      toast.success(response.data.message);
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      const errorResponse = error.response?.data;
      const errorMessage = errorResponse?.message || "Error resetting password";
      toast.error(errorMessage);

      if (status === 429 || errorMessage.toLowerCase().includes("too many attempts")) {
        setStep(1);
        setTimer(0);
        setCanResend(true); 
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }

      if (errorResponse?.maxAttemptsReached) {
        toast.error("Too many failed attempts. Please request a new OTP.");
        setStep(1);
        setTimer(0);
        setCanResend(false); 
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      {step === 1 && (
        <form className="forgot-card fade-in" onSubmit={handleSendOTP}>
          <h2>Reset Password</h2>
          <input
            className="forgot-input"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="forgot-button" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="loader"></span> Sending...
              </>
            ) : (
              "Send OTP"
            )}
          </button>
          {infoMessage && <p className="info-text">{infoMessage}</p>}
        </form>
      )}

      {step === 2 && (
        <form className="forgot-card fade-in" onSubmit={handleResetPassword}>
          <h2>Reset Password</h2>

          <label>Email</label>
          <input type="email" value={email} className="input-reset" readOnly />


          <label>New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="input-reset"
          />

          <label>Confirm Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="input-reset"
          />

          <label>OTP</label>
          <input
            type="text"
            required
            value={otp}
            onChange={e => setOtp(e.target.value)}
            className="input-reset"
          />
          <p className="countdown-text">
            OTP expires in: <strong>{formatTime(timer)}</strong>
          </p>

          <button
            type="submit"
            className="reset-button"
            disabled={loading || timer <= 0}
          >
            {loading ? 'Processing...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;