import React, { useState } from 'react';
import axios from 'axios';
import  {toast} from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const navigate = useNavigate();
    const [data, setData] = useState({
        name: '',
        email: '',  
        password: '',
    })

    const RegisterUser = async (e) => {
        e.preventDefault();
        const {name, email, password} = data;
        try {
            const {data} = await axios.post('/register', {name, email, password});
            if (data.error) {
                toast.error(data.error);
            } else {
                setData({});
                toast.success('Registration successful');
                navigate('/login');
            }
        } catch (error) {
            console.log(error);
        }
    }
    return (
        <div>
            <form onSubmit={RegisterUser}>
                <label htmlFor="username">Username</label>
                <input type="text" id="username" name="username" value={data.name} onChange={(e) => setData({...data, name: e.target.value})}/>

                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" value={data.email} onChange={(e) => setData({...data, email: e.target.value})} />

                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" value={data.password} onChange={(e) => setData({...data, password: e.target.value})}/>

                <button type="submit">Register</button>
            </form>
        </div>
    )
}
