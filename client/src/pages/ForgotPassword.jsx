import React, { useState } from 'react';
import '../styles/ForgotPassword.css';

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
  
    // Giả lập gửi OTP (2 giây)
    setTimeout(() => {
      setLoading(false);
      setInfoMessage("Please check your email to get OTP");
  
      // Hiển thị thông báo 2 giây rồi mới chuyển form
      setTimeout(() => {
        setInfoMessage('');
        setStep(2);
      }, 1500);
    }, 2000);
  };
  

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    console.log("Resetting password for:", email, "OTP:", otp);
    alert("Password reset successful!");
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