import React, { useState } from 'react';
import axios from 'axios';
import '../styles/AddUserByAdmin.css';

const AddUserByAdmin = ({ onUserAdded }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFormError('');
    
    // Client-side validation
    if (form.password.length < 6) {
      setErrors({ ...errors, password: 'Password must be at least 6 characters' });
      return;
    }

    try {
      const response = await axios.post('/admin/users', form, { 
        withCredentials: true 
      });
      
      // Success - reset form and close
      setForm({ name: '', email: '', password: '', role: 'user' });
      if (onUserAdded) onUserAdded();
    } catch (err) {
      // Handle backend validation errors
      if (err.response?.data?.errors) {
        // Field-specific errors
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.error) {
        // General form error
        setFormError(err.response.data.error);
      } else {
        setFormError('Failed to add user');
      }
    }
  };

  return (
    <div className="adduser-container">
      <form className="adduser-form" onSubmit={handleSubmit}>
        <h2>Add New User</h2>
        
        {formError && (
          <div className="form-error-message">
            {formError}
          </div>
        )}

        <label htmlFor="name">Username</label>
        <input
          type="text"
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className={errors.name ? 'input-error' : ''}
        />
        {errors.name && <span className="field-error">{errors.name}</span>}

        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className={errors.email ? 'input-error' : ''}
        />
        {errors.email && <span className="field-error">{errors.email}</span>}

        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          className={errors.password ? 'input-error' : ''}
        /> 
        {errors.password && <span className="field-error">{errors.password}</span>}

        <label htmlFor="role">Role</label>
        <select
          id="role"
          name="role"
          value={form.role}
          onChange={handleChange}
          className={errors.role ? 'input-error' : ''}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        {errors.role && <span className="field-error">{errors.role}</span>}

        <button type="submit">Add User</button>
      </form>
    </div>
  );
};

export default AddUserByAdmin;