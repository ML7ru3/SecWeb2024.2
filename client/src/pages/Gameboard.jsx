import { createContext, useContext, useEffect, useState, useRef} from 'react';
import { UserContext } from '../../context/UserContext.jsx';
import toast from 'react-hot-toast';
import NewGameButton from '../components/NewGameButton';
import '../styles/Gameboard.css';
import Game from './TheGame/Game.jsx'
import axios from 'axios'
import { useNavigate } from 'react-router-dom';


// eslint-disable-next-line react-refresh/only-export-components
export const GameContext = createContext(null);


export default function GameBoard() {
  
  const { user } = useContext(UserContext);
  const [bestUserScore, setBestUserScore] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [cellValues, setCellValues] = useState(Array(4).fill(null).map(() => Array(4).fill('')));
  const isLogin = useRef(false);
  const navigate = useNavigate();



  const incrementScore = (points) => {
    setUserScore((prevScore) => prevScore + points);
  };

  async function saveUser() {
    try {
        // Prepare the updated data
        const updatedData = {
            email: user.email, 
            lastGameSaved: cellValues, 
            scoreFromLastGameSaved: userScore,
            newHighScore: bestUserScore
        };

        // Send the PUT request to update the user
        const res = await axios.put('/update', updatedData);

        // Handle the response
        if (res.data.error) {
            toast.error(res.data.error); // Show error message if the backend returns an error
        } else {
            toast.success('Game saved successfully!'); // Show success message
        }
    } catch (err) {
        console.error('Error saving user:', err);
        toast.error('Failed to save game. Please try again.');
    }
}

  const handleSaveGame = () => {
    if (!user) {
      toast.error('You need to login to save game!');
      return;
    }
    saveUser();
    toast.success('Game saved!');
  };
  
  useEffect(() => {
    //load the last game session
    setBestUserScore(Math.max(bestUserScore, userScore));

    //for the user
    const loadLastGameSession = async () => {
      if (user && !isLogin.current){
        if (user.lastGameSaved) {
            await setCellValues(() => user.lastGameSaved);
            await setUserScore(() => user.scoreFromLastGameSaved);
            await setBestUserScore(() => user.highscore);
        }
        isLogin.current = true;
        setInitialized(true);
      } 
    }

    //for the anonymous
    const continuouslySaveGame = () => {
      if (user) return;
      localStorage.setItem('guestGameState', JSON.stringify({
        gameState: cellValues,
        tempScore: userScore,
        tempHighscore: bestUserScore,
      }));
    }
    loadLastGameSession();
    continuouslySaveGame();

  }, [userScore, user, bestUserScore]);

  function resetGame() {
    setInitialized(false);
    setUserScore(0);
    console.log('Resetting game...');
  };


  return (
    <div>
      {user?.role === 'admin' && (
        <button
          className="back-admin-button"
          onClick={() => navigate('/admin/dashboard')}
        >
          Go to Admin Dashboard
        </button>
      )}

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
        <GameContext.Provider value = {[incrementScore, initialized, setInitialized, cellValues, setCellValues, resetGame]} >
            <Game />
        </GameContext.Provider>

        <div className="button-group">
          <NewGameButton onNewGame={resetGame}  />
          <button className="button" onClick={handleSaveGame}>
            Save Game
          </button>
        </div>
      </div>
    </div>
  );
}
