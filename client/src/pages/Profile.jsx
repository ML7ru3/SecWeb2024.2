import { useContext, useEffect } from "react";
import { UserContext } from "../../context/UserContext";
import { useNavigate, Link } from 'react-router-dom';


export default function Profile(){
    const [user, setUser] = useContext(UserContext);
    const navigate = useNavigate();

    useEffect(() =>{
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate])

    return (
        <div>
            
        </div>
    );
}