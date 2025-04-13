import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router} from 'react-router-dom' // import BrowserRouter from react-router-dom library - enables routing and renames it to Router
// allows to defines routes and navigate between different components 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router> 
      <App />
    </Router>
  </StrictMode>,
)
