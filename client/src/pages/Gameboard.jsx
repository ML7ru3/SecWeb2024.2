import { useContext } from 'react';
import { UserContext } from '../../context/UserContext.jsx';
import toast from 'react-hot-toast';
import NewGameButton from '../components/NewGameButton';
import '../styles/Gameboard.css';

export default function GameBoard() {
  const { user } = useContext(UserContext);

  const handleSaveGame = () => {
    if (!user) {
      toast.error('You need to login to save game!');
      return;
    }
    // TODO: Save game data
    toast.success('Game saved!');
  };

  const resetGame = () => {
    // TODO: Logic reset grid + score
    console.log('Resetting game...');
  };

  return (
    <div className="gameboard">
      <div className="gameboard-header">
        <div className="left-info">
          <h2 className="game-title">2048</h2>
          {user && (
            <div className="welcome-user">
              Hi, <strong>{user.name}</strong>
            </div>
          )}
        </div>

        <div className="score-group">
          <div className="score-box">
            <div>Score</div>
            <div>0</div>
          </div>
          <div className="score-box">
            <div>Best</div>
            <div>0</div>
          </div>
        </div>
      </div>

      <div className="grid-placeholder">[Game Grid here]</div>

      <div className="button-group">
        <NewGameButton onNewGame={resetGame} />
        <button className="button" onClick={handleSaveGame}>
          Save Game
        </button>
      </div>
    </div>
  );
}
