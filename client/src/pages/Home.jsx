import { useNavigate } from "react-router-dom";
import GuestGame from "../pages/GuestGame";

export default function HomePage() {
    const navigate = useNavigate();

    const handleLogin = () => {
        navigate("/login");
    };

    const handleRegister = () => {
        navigate("/register");
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: 20,
                fontFamily: "sans-serif",
            }}
        >
            <h2>Welcome to 2048 Game</h2>

            {/* Buttons */}
            <div style={{ marginBottom: 20 }}>
                <button
                    onClick={handleLogin}
                    style={buttonStyle}
                >
                    Login
                </button>
                <button
                    onClick={handleRegister}
                    style={{ ...buttonStyle, marginLeft: 10 }}
                >
                    Register
                </button>
            </div>

            {/* Guest Game */}
            <GuestGame />
        </div>
    );
}

const buttonStyle = {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#8f7a66",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
};
