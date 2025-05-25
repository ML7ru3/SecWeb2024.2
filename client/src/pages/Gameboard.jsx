import { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { UserContext } from '../../context/UserContext.jsx';
import GameContext from '../../context/GameContext';
import toast from 'react-hot-toast';
import NewGameButton from '../components/NewGameButton';
import '../styles/Gameboard.css';
import Game from './TheGame/Game.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function GameBoard() {
  const { user } = useContext(UserContext);
  const [bestUserScore, setBestUserScore] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [cellValues, setCellValues] = useState(() => 
    Array(4).fill(null).map(() => Array(4).fill(''))
  );
  const isLogin = useRef(false);
  const navigate = useNavigate();

  const incrementScore = useMemo(() => (points) => {
    setUserScore((prevScore) => prevScore + points);
  }, []);

  async function saveUser() {
    try {
      const updatedData = {
        email: user.email,
        lastGameSaved: cellValues,
        scoreFromLastGameSaved: userScore,
        newHighScore: Math.max(bestUserScore, userScore)
      };

      const res = await axios.put('/update', updatedData);

      if (res.data.error) {
        toast.error(res.data.error);
      } else {
        toast.success('Game saved successfully!');
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
  };

  useEffect(() => {
    setBestUserScore(Math.max(bestUserScore, userScore));
    if (initialized)  return;
    
    
    const userGame = async () =>{
      await setCellValues(user.lastGameSaved);
      await setUserScore(user.scoreFromLastGameSaved || 0);
      await setBestUserScore(user.highscore || 0);
      isLogin.current = true;
      setInitialized(true);
    }

    const continuouslySaveGame = () => {
      localStorage.setItem('guestGameState', JSON.stringify({
        gameState: cellValues,
        tempScore: userScore,
        tempHighscore: bestUserScore,
      }));
    }

    
    if (user && !isLogin.current) userGame();
    else if (!user) continuouslySaveGame();  
    else {
        // Khởi tạo game mới cho guest
        console.log('Initializing the gane')
        setCellValues(Array(4).fill(null).map(() => Array(4).fill('')));
        addRandomNumber();
        addRandomNumber();
    }  
    setInitialized(true)
  }, [user, userScore]);

  // Hàm thêm số ngẫu nhiên
  const addRandomNumber = () => {
    setCellValues(prev => {
      const emptyCells = [];
      prev.forEach((row, i) => {
        row.forEach((cell, j) => {
          if (cell === '') emptyCells.push([i, j]);
        });
      });

      if (emptyCells.length === 0) return prev;

      const [i, j] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const newValue = Math.random() < 0.9 ? 2 : 4;
      
      const newCellValues = [...prev];
      newCellValues[i] = [...newCellValues[i]];
      newCellValues[i][j] = newValue;
      
      return newCellValues;
    });
  };

  function resetGame() {
    setCellValues(Array(4).fill(null).map(() => Array(4).fill('')));
    setUserScore(0);
    setInitialized(true);
    addRandomNumber();
    addRandomNumber();
    setTimeout(() => {
      toast.success('A new game installed!')
    }, 500);
  };

  const contextValue = useMemo(() => ({
    incrementScore,
    initialized,
    setInitialized,
    cellValues,
    setCellValues,
    addRandomNumber, // Thêm hàm này vào context
    resetGame
  }), [incrementScore, initialized, cellValues]);

  if (!initialized) {
    return <div>Loading game...</div>;
  }

  return (
    <div>
      {user?.role === 'admin' && (
        <button className="back-admin-button" onClick={() => navigate('/admin/dashboard')}>
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

        <GameContext.Provider value={contextValue}>
          <Game />
        </GameContext.Provider>

        <div className="button-group">
          <NewGameButton onNewGame={resetGame} />
          <button className="button" onClick={handleSaveGame}>
            Save Game
          </button>
        </div>
      </div>
    </div>
  );
}