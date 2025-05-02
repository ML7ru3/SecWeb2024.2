import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import AddUserByAdmin from './AddUserByAdmin';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/admin/users', { withCredentials: true });
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the user "${name}"?`)) return;
    try {
      await axios.delete(`/admin/users/${id}`, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const resetScore = async (id, name) => {
    if (!window.confirm(`Are you sure you want to reset "${name}" score?`)) return;
    try {
      await axios.put(`/admin/users/${id}/reset-score`, {}, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      console.error('Error resetting score:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <button className="back-button" onClick={() => navigate('/')}>
        Go to Gameboard
      </button>

      <button className="add-user-button" onClick={() => setShowAddForm(true)}>
          Add User
        </button>
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <AddUserByAdmin onUserAdded={() => {
                fetchUsers();
                setShowAddForm(false);
              }} />
              <button className="close-button" onClick={() => setShowAddForm(false)}>
                Close
              </button>
            </div>
          </div>
        )}

      <div className="admin-container">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Highscore</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id} className={user.role === 'admin' ? 'admin-row' : ''}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role || 'user'}</td>
                  <td>{user.highscore}</td>
                  <td>
                    <button onClick={() => resetScore(user._id, user.name)}>Reset Score</button>
                    <button onClick={() => deleteUser(user._id, user.name)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
