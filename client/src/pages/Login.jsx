import React, { useState }from 'react'
import axios from 'axios';

export default function Login() {
    const [data, setData] = useState({
            email: '',  
            password: '',
    })

    const LoginUser = async (e) => {
        e.preventDefault();
        axios.get('/')
    }

    return (
        <div>
            <form onSubmit={LoginUser}>
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" value={data.email} onChange={(e) => setData({...data, email: e.target.value})} required />

                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" value={data.password} onChange={(e) => setData({...data, password: e.target.value})}required />

                <button type="submit">Login</button>
            </form>
        </div>
    )
}
