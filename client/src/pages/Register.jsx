import React, { useState } from 'react';

export default function Register() {
    const [data, setData] = useState({
        name: '',
        email: '',  
        password: '',
    })

    const RegisterUser = async (e) => {
        e.preventDefault();
    }
    return (
        <div>
            <form onSubmit={RegisterUser}>
                <label htmlFor="username">Username</label>
                <input type="text" id="username" name="username" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} required />

                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" value={data.email} onChange={(e) => setData({...data, email: e.target.value})} required />

                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" value={data.password} onChange={(e) => setData({...data, password: e.target.value})} required />

                <button type="submit">Register</button>
            </form>
        </div>
    )
}
