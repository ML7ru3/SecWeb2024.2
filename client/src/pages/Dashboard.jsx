import { useContext, useEffect, useState } from "react";
import cloneDeep from "lodash/cloneDeep";
import { UserContext } from "../../context/UserContext";
import { getColors, useEvent } from "../helper/util.js";

export default function Dashboard() {
    const { user } = useContext(UserContext);

    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(
        Number(localStorage.getItem("bestScore")) || 0
    );

    const [data, setData] = useState([
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ]);

    // Initialize
    const initialize = () => {
        let newGrid = cloneDeep(data); // make a copy of data
        setScore(0);
        addNumber(newGrid);
        addNumber(newGrid);
        setData(newGrid); // Save to state
    };

    // AddNumber - Add an item
    const addNumber = (newGrid) => {
        let added = false; // tracks if we’ve successfully added a number
        let attempts = 0; // prevents the function from trying forever (in case grid is full)

        while (!added && attempts < 50) {
            let rand1 = Math.floor(Math.random() * 4); // random row (0 to 3)
            let rand2 = Math.floor(Math.random() * 4); // random column (0 to 3) -> random coordinate

            if (newGrid[rand1][rand2] === 0) {
                newGrid[rand1][rand2] = Math.random() > 0.5 ? 2 : 4; // random value
                added = true;
            }

            attempts++;
        }

        if (!added) {
            console.log("Grid is full, cannot add a new number.");
        }
    };

    // Swipe Left
    const swipeLeft = () => {
        let oldGrid = data; // state - store the original grid to compare later
        let newGrid = cloneDeep(data); // a deep copy to modify (never change state directly)

        let newScore = score;

        for (let i = 0; i < 4; i++) { // Looping through each row in the 4x4 grid
            let b = newGrid[i];
            let slow = 0; // pointer points to the index where we try to move or merge into
            let fast = 1; // pointer points to the tile we're currently checking 
            
            while (slow < 4) {
                // case 1: check if fast has gone out of bounds -> shift slow forward by one + reset fast to be just after slow -> continue the loop
                if (fast === 4) {
                    fast = slow + 1;
                    slow++;
                    continue;
                }
                // case 2: if both positions are 0 -> just move fast forward - nothing to do (0,0)
                if (b[slow] === 0 && b[fast] === 0) {
                    fast++;
                // cse 3: slow is empty, fast has a number -> move fast tile into slow spot + clear old fast = 0 -> move fast forward (0,a) -> (a,0) -> fast++
                } else if (b[slow] === 0 && b[fast] !== 0) { 
                    b[slow] = b[fast];
                    b[fast] = 0;
                    fast++;
                // csae 4: just move fast forward -> looking for something to merge with slow (a, 0) -> fast++
                } else if (b[slow] !== 0 && b[fast] === 0) {
                    fast++;
                // case 5: both have numbers -> check if they can merge (they are the same) (a,a) -> (2a, 0) or (a,b) -> slow++, fast = slow + 1
                } else if (b[slow] !== 0 && b[fast] !== 0) {
                    if (b[slow] === b[fast]) {
                        b[slow] += b[fast];
                        b[fast] = 0;

                        newScore += b[slow];

                        fast = slow + 1;
                        slow++;
                    } else {
                        slow++;
                        fast = slow + 1;
                    }
                }
            }
        }

        if (JSON.stringify(oldGrid) !== JSON.stringify(newGrid)) {
            addNumber(newGrid);
        }
        setData(newGrid);
        setScore(newScore);

        if (newScore > bestScore){
            setBestScore(newScore);
            localStorage.setItem("bestScore", newScore);
        }

        // Check if the game is over
        if (checkIfGameOver(newGrid)) {
            alert("Game Over!");
        }
    };

    // Swipe Right
    const swipeRight = () => {
        let oldGrid = data;
        let newGrid = cloneDeep(data);
        let newScore = score;

        for (let i = 0; i < 4; i++) {
            let b = newGrid[i].reverse(); // if [2, 0, 2, 4] -> reverse(): [4, 2, 0, 2]
            let slow = 0;
            let fast = 1;
            while (slow < 4) {
                // case 1
                if (fast === 4) {
                    fast = slow + 1;
                    slow++;
                    continue;
                }
                // case 2: (0,0) -> fast++
                if (b[slow] === 0 && b[fast] === 0) {
                    fast++;
                // case 3: (0,a) -> (a,0) -> fast++
                } else if (b[slow] === 0 && b[fast] !== 0) {
                    b[slow] = b[fast];
                    b[fast] = 0;
                    fast++;
                // case 4: (a,0) -> fast++
                } else if (b[slow] !== 0 && b[fast] === 0) {
                    fast++;
                // case 5: (a,a) -> (2a,0) or (a,b) -> slow++, fast=slow+1 (remain + check next)
                } else if (b[slow] !== 0 && b[fast] !== 0) {
                    if (b[slow] === b[fast]) {
                        b[slow] += b[fast];
                        b[fast] = 0;

                        newScore += b[slow];

                        fast = slow + 1;
                        slow++;
                    } else {
                        slow++;
                        fast = slow + 1;
                    }
                }
            }
            newGrid[i] = b.reverse(); // finished -> reverse again: [4, 4, 0, 0] -> [0, 0, 4, 4]
        }

        if (JSON.stringify(oldGrid) !== JSON.stringify(newGrid)) { // changed
            addNumber(newGrid); // add a new number
        }
        setData(newGrid); // update new grid
        setScore(newScore);

        if (newScore > bestScore){
            setBestScore(newScore);
            localStorage.setItem("bestScore", newScore);
        }

        // Check if the game is over
        if (checkIfGameOver(newGrid)) {
            alert("Game Over!");
        }
    };
    // Swipe Up
    const swipeUp = () => {
        let oldGrid = data;
        let newGrid = cloneDeep(data);
        let newScore = score;
    
        // Transpose the grid
        for (let i = 0; i < 4; i++) {
            for (let j = i + 1; j < 4; j++) {
                let temp = newGrid[i][j];
                newGrid[i][j] = newGrid[j][i];
                newGrid[j][i] = temp;
            }
        }
    
        // Apply swipeLeft logic
        for (let i = 0; i < 4; i++) {
            let b = newGrid[i];
            let slow = 0;
            let fast = 1;
            while (slow < 4) {
                if (fast === 4) {
                    fast = slow + 1;
                    slow++;
                    continue;
                }
                if (b[slow] === 0 && b[fast] === 0) {
                    fast++;
                } else if (b[slow] === 0 && b[fast] !== 0) {
                    b[slow] = b[fast];
                    b[fast] = 0;
                    fast++;
                } else if (b[slow] !== 0 && b[fast] === 0) {
                    fast++;
                } else if (b[slow] !== 0 && b[fast] !== 0) {
                    if (b[slow] === b[fast]) {
                        b[slow] += b[fast];
                        b[fast] = 0;

                        newScore += b[slow];

                        fast = slow + 1;
                        slow++;
                    } else {
                        slow++;
                        fast = slow + 1;
                    }
                }
            }
        }
    
        // Transpose the grid back
        for (let i = 0; i < 4; i++) {
            for (let j = i + 1; j < 4; j++) {
                let temp = newGrid[i][j];
                newGrid[i][j] = newGrid[j][i];
                newGrid[j][i] = temp;
            }
        }
    
        if (JSON.stringify(oldGrid) !== JSON.stringify(newGrid)) {
            addNumber(newGrid);
        }
        setData(newGrid);
        setScore(newScore);

        if (newScore > bestScore){
            setBestScore(newScore);
            localStorage.setItem("bestScore", newScore);
        }

        // Check if the game is over
        if (checkIfGameOver(newGrid)) {
            alert("Game Over!");
        }
    };

    // Swipe Down
    const swipeDown = () => {
        let oldGrid = data;
        let newGrid = cloneDeep(data);
        let newScore = score;
    
        // Transpose the grid
        for (let i = 0; i < 4; i++) {
            for (let j = i + 1; j < 4; j++) {
                let temp = newGrid[i][j];
                newGrid[i][j] = newGrid[j][i];
                newGrid[j][i] = temp;
            }
        }
    
        // Reverse each row
        for (let i = 0; i < 4; i++) {
            newGrid[i].reverse();
        }
    
        // Apply swipeLeft logic
        for (let i = 0; i < 4; i++) {
            let b = newGrid[i];
            let slow = 0;
            let fast = 1;
            while (slow < 4) {
                if (fast === 4) {
                    fast = slow + 1;
                    slow++;
                    continue;
                }
                if (b[slow] === 0 && b[fast] === 0) {
                    fast++;
                } else if (b[slow] === 0 && b[fast] !== 0) {
                    b[slow] = b[fast];
                    b[fast] = 0;
                    fast++;
                } else if (b[slow] !== 0 && b[fast] === 0) {
                    fast++;
                } else if (b[slow] !== 0 && b[fast] !== 0) {
                    if (b[slow] === b[fast]) {
                        b[slow] += b[fast];
                        b[fast] = 0;

                        newScore += b[slow];

                        fast = slow + 1;
                        slow++;
                    } else {
                        slow++;
                        fast = slow + 1;
                    }
                }
            }
        }
    
        // Reverse each row back
        for (let i = 0; i < 4; i++) {
            newGrid[i].reverse();
        }
    
        // Transpose the grid back
        for (let i = 0; i < 4; i++) {
            for (let j = i + 1; j < 4; j++) {
                let temp = newGrid[i][j];
                newGrid[i][j] = newGrid[j][i];
                newGrid[j][i] = temp;
            }
        }
    
        if (JSON.stringify(oldGrid) !== JSON.stringify(newGrid)) {
            addNumber(newGrid);
        }
        setData(newGrid);
        setScore(newScore);

        if (newScore > bestScore){
            setBestScore(newScore);
            localStorage.setItem("bestScore", newScore);
        }

        // Check if the game is over
        if (checkIfGameOver(newGrid)) {
            alert("Game Over!");
        }
    };

    // Check GameOver
    const checkIfGameOver = (grid) => {
        // Check if there are any empty cells
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (grid[i][j] === 0) {
                    return false; // Game is not over if there is an empty cell
                }
            }
        }
    
        // Check if any adjacent cells are the same (horizontally or vertically)
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (
                    (i > 0 && grid[i][j] === grid[i - 1][j]) || // Check above
                    (i < 3 && grid[i][j] === grid[i + 1][j]) || // Check below
                    (j > 0 && grid[i][j] === grid[i][j - 1]) || // Check left
                    (j < 3 && grid[i][j] === grid[i][j + 1])    // Check right
                ) {
                    return false; // Game is not over if there are adjacent cells with the same value
                }
            }
        }
    
        return true; // Game is over if no empty cells and no adjacent cells are the same
    };
    
    // Reset
    const reset = () => {
        const newGrid = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        setScore(0);
        addNumber(newGrid);
        addNumber(newGrid);
        setData(newGrid);
    };
    // HANDLE KEY DOWN
    const handleKeyDown = (event) => {
        switch (event.code) {
            case "ArrowUp":
                swipeUp();
                break;
            case "ArrowDown":
                swipeDown();
                break;
            case "ArrowRight":
                swipeRight();
                break;
            case "ArrowLeft":
                swipeLeft();
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        initialize();
    }, []);
    useEvent("keydown", handleKeyDown);

    return (
        <div>
            <div style={{textAlign: "center", marginTop: 10}}>
                <p>Score: {score}</p>
                <p>Best Score: {bestScore}</p>
            </div>
            <div 
                style={{
                    background: "#AD9D8F",
                    width: "max-content",
                    margin: "auto",
                    padding: 5,
                    borderRadius: 5,
                    marginTop: 10,
                }}
            >
                {data.map((row, oneIndex) => (
                    <div style={{ display: "flex" }} key={oneIndex}>
                        {row.map((digit, Index) => (
                            <Block num={digit} key={Index} />
                        ))}
                    </div>
                ))}
            </div>
            <div>
            <button
                    onClick={reset} 
                    style={{
                        marginTop: 10,
                        padding: "10px 20px",
                        fontSize: "16px",
                        fontWeight: "bold",
                        background: "#8f7a66",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Reset Game
                </button>
            </div>
        </div>
    );
}

const Block = ({ num }) => {
    return (
        <div
            style={{
                ...style,
                background: getColors(num),
                color: num === 2 || num === 4 ? "#645B" : "#FFF",
            }}
        >
            {num !== 0 ? num : ""}
        </div>
    );
};

const style = {
    width: 80,
    height: 80,
    background: "lightgrey",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: 3,
    fontSize: 35,
    fontWeight: "800",
    color: "white",
};