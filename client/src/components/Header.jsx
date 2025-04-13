import { Link } from "react-router-dom";
import "../styles/Header.css";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import Logout from "../pages/Logout";


export default function Header() {
    const { user } = useContext(UserContext);

    return (
        <header className="header">
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" /> 
            <div className="logo-wrapper">
                <Link to="/">
                    <img src="/logo.jpeg" alt="2048 Logo" className="logo" />
                </Link>
            </div>
            <nav className="nav-links">
                {user ? (
                    <>
                        <span className="user-info">
                            <span className="user-icon">
                                <span className="material-icons">person_outline</span>
                            </span>
                            {user.name}
                        </span>


                        <Logout />
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register">Register</Link>
                    </>
                )}
            </nav>
        </header>
    );
}
