import React, { useEffect, useContext} from 'react';
import './Game.css';
import { GameContext } from '../Gameboard'; 
import { UserContext } from '../../../context/UserContext';




export default function Game() {
    const  [incrementScore, initialized, setInitialized, cellValues, setCellValues, resetGame]  = useContext(GameContext);   

    const randomNumberGenerator = () => {
        setCellValues((prevCellValues) => {
            const newCellValues = [...prevCellValues.map(row => [...row])]; // Deep copy of the grid
            let col = Math.floor(Math.random() * 4), row = Math.floor(Math.random() * 4);
            let MAX_COUNT = 0;
            while (newCellValues[col][row] !== '' && MAX_COUNT <= 1000) {
                col = Math.floor(Math.random() * 4);
                row = Math.floor(Math.random() * 4);
                MAX_COUNT++;
            }
            if (MAX_COUNT > 1000) {
                alert("Game Over!");
                resetGame();
                return prevCellValues; // Return the previous state if no empty cell is found
            }
            newCellValues[col][row] = Math.random() < 0.9 ? 2 : 4; // Add a random number (2 or 4)
            return newCellValues; // Return the updated grid
        });
    };

    //TODO: Implement swiping for mobile phone

    const handleKeyPress = (event) => {
        const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

        // Check if the pressed key is valid
        if (!validKeys.includes(event.key)) {
            return; // Exit early if the key is not valid
        }

        
        setCellValues((prevCellValues) => {
            let newCellValues = prevCellValues.map(row => [...row]); // Proper deep copy of the grid
        
            switch (event.key) {
                case 'ArrowUp':
                    for (let j = 0; j < 4; j++) {
                        const row = [];
                        for (let i = 0; i < 4; i++) row.push(newCellValues[i][j]);
                        for (let i = 0; i < row.length; i++) {
                            if (row[i] === '') {
                                row.splice(i, 1);
                                i--;
                            }
                        }
    
                        // Merge cells
                        for (let i = 0; i < row.length - 1; i++) {
                            if (row[i] === row[i + 1]) {
                                row[i] *= 2;
                                incrementScore(row[i]);
                                row.splice(i + 1, 1);
                            }
                        }
    
                        // Assign back to the grid
                        for (let i = 0; i < row.length; i++) newCellValues[i][j] = row[i];
                        for (let i = row.length; i < 4; i++) newCellValues[i][j] = '';
                    }
                    break;
    
                case 'ArrowDown':
                    for (let j = 0; j < 4; j++) {
                        const row = [];
                        for (let i = 0; i < 4; i++) row.push(newCellValues[i][j]);
                        for (let i = 0; i < row.length; i++) {
                            if (row[i] === '') {
                                row.splice(i, 1);
                                i--;
                            }
                        }
    
                        // Merge cells
                        for (let i = row.length - 1; i > 0; i--) {
                            if (row[i] === row[i - 1]) {
                                row[i] *= 2;
                                incrementScore(row[i]);
                                row.splice(i - 1, 1);
                            }
                        }
    
                        // Assign back to the grid
                        for (let i = 0; i < 4 - row.length; i++) newCellValues[i][j] = '';
                        for (let i = 4 - row.length, index = 0; i < 4; i++, index++) newCellValues[i][j] = row[index];
                    }
                    break;
    
                case 'ArrowLeft':
                    for (let i = 0; i < 4; i++) {
                        const row = [];
                        for (let j = 0; j < 4; j++) row.push(newCellValues[i][j]);
                        for (let j = 0; j < row.length; j++) {
                            if (row[j] === '') {
                                row.splice(j, 1);
                                j--;
                            }
                        }
    
                        // Merge cells
                        for (let j = 0; j < row.length - 1; j++) {
                            if (row[j] === row[j + 1]) {
                                row[j] *= 2;
                                incrementScore(row[j]);
                                row.splice(j + 1, 1);
                            }
                        }
    
                        // Assign back to the grid
                        for (let j = 0; j < row.length; j++) newCellValues[i][j] = row[j];
                        for (let j = row.length; j < 4; j++) newCellValues[i][j] = '';
                    }
                    break;
    
                case 'ArrowRight':
                    for (let i = 0; i < 4; i++) {
                        const row = [];
                        for (let j = 0; j < 4; j++) row.push(newCellValues[i][j]);
                        for (let j = 0; j < row.length; j++) {
                            if (row[j] === '') {
                                row.splice(j, 1);
                                j--;
                            }
                        }
    
                        // Merge cells
                        for (let j = row.length - 1; j > 0; j--) {
                            if (row[j] === row[j - 1]) {
                                row[j] *= 2;
                                incrementScore(row[j]);
                                row.splice(j - 1, 1);
                            }
                        }
    
                        // Assign back to the grid
                        for (let j = 0; j < 4 - row.length; j++) newCellValues[i][j] = '';
                        for (let j = 4 - row.length, index = 0; j < 4; j++, index++) newCellValues[i][j] = row[index];
                    }
                    break;
    
                default:
                    return prevCellValues; // Return the previous state if no valid key is pressed
            }
    
            return newCellValues; // Return the updated grid
        });
    
        // Generate a new random number
        randomNumberGenerator();
    };

    //check reset and add listener
    useEffect(() => {
        if (!initialized) {
            console.log('Initilizing the game...')
            setCellValues(() => Array(4).fill(null).map(() => Array(4).fill('')));
            setInitialized(true);
            randomNumberGenerator();
            randomNumberGenerator();
        }

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [initialized]);

    const cells = [];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            cells.push(
                <div className={`cell value-${cellValues[i][j] || 0}`} key={`${i}-${j}`}>
                    {cellValues[i][j]}
                </div>

            );
        }
    }

    return (
        <div className="centered-div">
            <div className="grid">
                {cells}
            </div>
        </div>
    );

    
}
