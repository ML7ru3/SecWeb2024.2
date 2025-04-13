
import { useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import "../styles/Logout.css"; 

export default function Logout() {
    const navigate = useNavigate();
    const { setUser } = useContext(UserContext);

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Are you sure you want to log out?',
            text: 'Your login session will end immediately.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff6f61', 
            cancelButtonColor: '#4caf50', 
            confirmButtonText: 'Log out',
            cancelButtonText: 'Cancel',
            reverseButtons: true, 
            padding: '30px', 
            backdrop: true, 
            allowOutsideClick: false, 
            customClass: {
                popup: 'swal-popup', 
                title: 'swal-title', 
                content: 'swal-content',
                confirmButton: 'swal-confirm-button', 
                cancelButton: 'swal-cancel-button' 
            }
        });
    

        if (result.isConfirmed) {
            try {
                await axios.post('/logout');
                setUser(null);
                toast.success("Đăng xuất thành công!");
                navigate("/login");
            } catch (err) {
                console.error(err);
                toast.error("Có lỗi xảy ra khi đăng xuất.");
            }
        }
    };

    return (
        <button onClick={handleLogout} className="logout-button">
            Logout
        </button>
    );
}