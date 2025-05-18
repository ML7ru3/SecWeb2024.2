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
  const [timer, setTimer] = useState(0); // in seconds
  const navigate = useNavigate();

  // Countdown effect
  useEffect(() => {
    let countdown;
    if (step === 2 && timer > 0) {
      countdown = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }

    if (timer === 0 && step === 2) {
      toast.error("OTP expired. Please request a new one.");
    }

    return () => clearInterval(countdown);
  }, [step, timer]);

  const formatTime = (secs) => {
  return `${secs} second${secs !== 1 ? 's' : ''}`;
  };


  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInfoMessage('');

    try {
      const response = await axios.post('/forgot-password', { email });
      setInfoMessage(response.data.message);
      setTimeout(() => {
        setStep(2);
        setTimer(15 * 60); // 15 minutes = 900 seconds
        setInfoMessage('');
      }, 1500);
    } catch (error) {
      setInfoMessage(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (timer <= 0) {
      toast.error("OTP has expired. Please request a new one.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await axios.post('/reset-password', {
        email,
        otp,
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      alert(response.data.message);

      // Navigate to login page after 1 second
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error resetting password");
    }
  };

  return (
    <div className="forgot-container">
      {step === 1 && (
        <form className={`forgot-card fade-in`} onSubmit={handleSendOTP}>
          <h2>Send OTP</h2>
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
                <span className="loader"></span> Sending email...
              </>
            ) : (
              "Submit"
            )}
          </button>

          {infoMessage && <p className="info-text">{infoMessage}</p>}
        </form>
      )}

      {step === 2 && (
        <form className="forgot-card fade-in" onSubmit={handleResetPassword}>
          <h2>Reset Password</h2>

          <label>Email</label>
          <input type="email" required value={email} className="input-reset" readOnly />

          <label>New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="input-reset"
          />

          <label>Confirm new password</label>
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
            disabled={timer <= 0}
          >
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;
