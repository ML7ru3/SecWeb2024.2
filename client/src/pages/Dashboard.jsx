import { useContext, useEffect, useState } from "react";
import cloneDeep from "lodash/cloneDeep";
import { UserContext } from "../../context/UserContext";
import { getColors, useEvent } from "../helper/util.js";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Dashboard() {
    const { setUser } = useContext(UserContext);
    const navigate = useNavigate();

    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);

    const [data, setData] = useState([
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ]);

    const initialize = () => {
        let newGrid = cloneDeep(data);
        setScore(0);
        addNumber(newGrid);
        addNumber(newGrid);
        setData(newGrid);
    };

    const addNumber = (newGrid) => {
        let added = false;
        let attempts = 0;

        while (!added && attempts < 50) {
            let rand1 = Math.floor(Math.random() * 4);
            let rand2 = Math.floor(Math.random() * 4);

            if (newGrid[rand1][rand2] === 0) {
                newGrid[rand1][rand2] = Math.random() > 0.5 ? 2 : 4;
                added = true;
            }

            attempts++;
        }

        if (!added) console.log("Grid is full, cannot add a new number.");
    };

    const swipe = (grid, reverse = false, transpose = false) => {
        let newGrid = cloneDeep(grid);
        let newScore = score;

        if (transpose) {
            for (let i = 0; i < 4; i++) {
                for (let j = i + 1; j < 4; j++) {
                    let temp = newGrid[i][j];
                    newGrid[i][j] = newGrid[j][i];
                    newGrid[j][i] = temp;
                }
            }
        }

        for (let i = 0; i < 4; i++) {
            let row = reverse ? newGrid[i].slice().reverse() : newGrid[i].slice();
            let slow = 0, fast = 1;
            while (slow < 4) {
                if (fast === 4) {
                    fast = ++slow + 1;
                    continue;
                }
                if (row[slow] === 0 && row[fast] !== 0) {
                    row[slow] = row[fast];
                    row[fast] = 0;
                } else if (row[slow] !== 0 && row[fast] === row[slow]) {
                    row[slow] += row[fast];
                    row[fast] = 0;
                    newScore += row[slow];
                    fast = ++slow + 1;
                    continue;
                } else if (row[fast] !== 0 && row[slow] !== 0) {
                    slow++;
                    fast = slow + 1;
                    continue;
                }
                fast++;
            }
            newGrid[i] = reverse ? row.reverse() : row;
        }

        if (transpose) {
            for (let i = 0; i < 4; i++) {
                for (let j = i + 1; j < 4; j++) {
                    let temp = newGrid[i][j];
                    newGrid[i][j] = newGrid[j][i];
                    newGrid[j][i] = temp;
                }
            }
        }

        if (JSON.stringify(grid) !== JSON.stringify(newGrid)) {
            addNumber(newGrid);
        }

        setData(newGrid);
        setScore(newScore);

        if (newScore > bestScore) {
            setBestScore(newScore);
            
        }

        if (checkIfGameOver(newGrid)) {
            alert("Game Over!");
        }
    };

    const handleKeyDown = (e) => {
        if (e.code === "ArrowLeft") swipe(data, false, false);
        if (e.code === "ArrowRight") swipe(data, true, false);
        if (e.code === "ArrowUp") swipe(data, false, true);
        if (e.code === "ArrowDown") swipe(data, true, true);
    };

    const checkIfGameOver = (grid) => {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let current = grid[i][j];
                if (current === 0) return false;
                if (j < 3 && current === grid[i][j + 1]) return false;
                if (i < 3 && current === grid[i + 1][j]) return false;
            }
        }
        return true;
    };

    const reset = () => {
        const emptyGrid = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        setScore(0);
        addNumber(emptyGrid);
        addNumber(emptyGrid);
        setData(emptyGrid);
    };

    useEffect(() => {
        const loadSavedGame = async () => {
            try {
                const res = await axios.get("/dashboard", {
                    withCredentials: true,
                });
    
                if (res.data.board) {
                    setData(res.data.board);
                    setScore(res.data.score || 0);
                    setBestScore(res.data.bestScore || 0);
                } else {
                    initialize();
                }
            } catch (err) {
                console.error("Error loading saved game:", err);
                initialize(); 
            }
        };
    
        loadSavedGame();
    }, []);
    
    
    useEvent("keydown", handleKeyDown);

    const handleRank = () => {
        navigate("/rank");
    };

    const handleLogout = async () => {
        try {
            const res = await axios.post("/logout", {}, { withCredentials: true });
            if (res.data.status === "success") {
                setUser(null);
                navigate("/");
            } else {
                console.error("Logout failed:", res.data.message);
            }
        } catch (err) {
            console.error("Error logging out:", err);
        }
    };
    const handleSaveGame = async () => {
        try {
            await axios.post("/dashboard", {
                board: data,
                score,
                bestScore
            }, {
                withCredentials: true
            });
            alert("Game saved!");
        } catch (err) {
            alert("Failed to save game.");
        }
    };
    
    

    return (
        <div>
            <div style={{ marginTop: 10 }}>
                <button onClick={handleRank} style={buttonStyle}>Rank</button>
                <button onClick={handleLogout} style={buttonStyle}>Logout</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
                <p>Score: {score}</p>
                <p>Best Score: {bestScore}</p>
            </div>
            <div style={gridWrapperStyle}>
                {data.map((row, rowIndex) => (
                    <div style={{ display: "flex" }} key={rowIndex}>
                        {row.map((digit, colIndex) => (
                            <Block num={digit} key={colIndex} />
                        ))}
                    </div>
                ))}
            </div>
            <div style={{ marginBottom: 20 }}>
                <button onClick={reset} style={buttonStyle}>Reset Game</button>
                <button onClick={handleSaveGame} style={buttonStyle}>Save Game</button>
            </div>
        </div>
    );
}

const Block = ({ num }) => {
    return (
        <div
            style={{
                ...blockStyle,
                background: getColors(num),
                color: num === 2 || num === 4 ? "#645B5B" : "#FFF",
            }}
        >
            {num !== 0 ? num : ""}
        </div>
    );
};

const buttonStyle = {
    marginRight: 10,
    marginTop: 10,
    padding: "10px 20px",
    fontSize: "16px",
    fontWeight: "bold",
    background: "#8f7a66",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
};

const gridWrapperStyle = {
    background: "#AD9D8F",
    width: "max-content",
    margin: "auto",
    padding: 5,
    borderRadius: 5,
    marginTop: 10,
};

const blockStyle = {
    width: 80,
    height: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: "bold",
    margin: 5,
    borderRadius: 5,
};
