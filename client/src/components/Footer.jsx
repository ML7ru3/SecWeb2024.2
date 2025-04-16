import { Link } from "react-router-dom";
import "../styles/Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <img src="/logo.jpeg" alt="2048 Logo" className="footer-logo" />
          <span className="footer-title">2048 Game</span>
        </div>

        <div className="footer-right">
          <p>© {new Date().getFullYear()} 2048team. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
