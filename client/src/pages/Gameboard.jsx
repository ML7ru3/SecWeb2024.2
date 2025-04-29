import { createContext, useContext, useEffect, useState} from 'react';
import { UserContext } from '../../context/UserContext.jsx';
import toast from 'react-hot-toast';
import NewGameButton from '../components/NewGameButton';
import '../styles/Gameboard.css';
import Game from './TheGame/Game.jsx'


export const GameContext = createContext(null);


export default function GameBoard() {
  
  const { user } = useContext(UserContext);
  const [bestUserScore, setBestUserScore] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const incrementScore = (points) => {
    setUserScore((prevScore) => prevScore + points);
  };

  const handleSaveGame = () => {
    if (!user) {
      toast.error('You need to login to save game!');
      return;
    }
    // TODO: Save game data
    toast.success('Game saved!');
  };
  
  useEffect(() => {
    console.log(initialized)
    setBestUserScore(Math.max(bestUserScore, userScore));
  }, [userScore, initialized]);

  function resetGame() {
    setInitialized(false);
    setUserScore(0);
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
            <div>{userScore}</div>
          </div>
          <div className="score-box">
            <div>Best</div>
            <div>{bestUserScore}</div>
          </div>
        </div>
      </div>

      {/*Here's the gameplay*/}
      <GameContext.Provider value = {[incrementScore, initialized, setInitialized]} >
          <Game />
      </GameContext.Provider>

      <div className="button-group">
        <NewGameButton onNewGame={resetGame}  />
        <button className="button" onClick={handleSaveGame}>
          Save Game
        </button>
      </div>
    </div>
  );
}
