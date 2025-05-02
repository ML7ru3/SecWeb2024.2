import React, { useState } from 'react';
import axios from 'axios';
import '../styles/ForgotPassword.css';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInfoMessage('');
  
    try{
      const response = await axios.post('/forgot-password', {email});
      setInfoMessage(response.data.message);
      setTimeout(() => {
        setStep(2);
        setInfoMessage('');
      }
      , 1500);
    }catch (error) {
      setInfoMessage(error.response?.data?.message ||'Failed to send OTP. Please try again.');
    }finally{
      setLoading(false);
    }
  };
  

  const handleResetPassword = async (e) => {
    e.preventDefault();

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
      setStep(1); 
      setEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error( error.response?.data?.message || "Error resetting password");
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
          <input
            type="email"
            required
            value={email}
            className="input-reset"
            readOnly
          />

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

          <button type="submit" className="reset-button">Reset Password</button>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;