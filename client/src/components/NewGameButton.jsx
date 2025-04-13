import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export default function NewGameButton({ onNewGame }) {
  const handleClick = async () => {
    const result = await Swal.fire({
      title: 'Are you sure you want to play new?',
      text: 'Current game data will be lost!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Play New',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef476f',
      cancelButtonColor: '#6c757d',
    });

    if (result.isConfirmed) {
      onNewGame?.(); // Call the onNewGame function if it exists
      toast.success('Start a new game!');
    }
  };

  return (
    <button className="button" onClick={handleClick}>
      New Game
    </button>
  );
}
