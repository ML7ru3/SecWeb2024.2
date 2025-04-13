import {Link } from "react-router-dom";

export default function NavBar() {
    return (
       <nav>
            <Link to="/rank">Rank</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
       </nav>
    )
}
