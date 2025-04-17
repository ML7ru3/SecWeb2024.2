import React, { useContext, useState, useEffect } from "react";
import axios from 'axios';
import { UserContext } from "../../context/UserContext";

export default function Rank() {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios.get('/rank')
      .then(res => {
        console.log('Rank data:', res.data.data);
        setUsers(res.data.data);
      })
      .catch(err => console.error('Error loading rank: ', err));
  }, []);

  return (
    <div className="rank-container" style={{ padding: '1rem' }}>
      <h2>🏆 2048 Leaderboard</h2>
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>🏅 Rank</th>
            <th>👤 Name</th>
            <th>📧 Email</th>
            <th>💯 Score</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u._id}>
              <td>{i + 1}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.bestScore }</td> 
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
