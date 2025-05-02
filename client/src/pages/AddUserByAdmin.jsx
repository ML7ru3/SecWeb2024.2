import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import '../styles/AddUserByAdmin.css';

const AddUserByAdmin = ({ onUserAdded }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/admin/users', form, { withCredentials: true });
      toast.success('User added successfully!');
      setForm({ name: '', email: '', password: '', role: 'user' });
      if (onUserAdded) onUserAdded();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add user');
    }
  };

  return (
    <div className="adduser-container">
      <form className="adduser-form" onSubmit={handleSubmit}>
        <h2>Add New User</h2>

        <label htmlFor="name">Username</label>
        <input
          type="text"
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <label htmlFor="role">Role</label>
        <select
          id="role"
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit">Add User</button>
      </form>
    </div>
  );
};

export default AddUserByAdmin;
