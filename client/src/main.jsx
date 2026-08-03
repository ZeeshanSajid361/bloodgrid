import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.onerror = function(msg, url, lineNo, columnNo, error) {
  alert('Error: ' + msg + '\nLine: ' + lineNo + '\nCol: ' + columnNo + '\nError object: ' + JSON.stringify(error));
  return false;
};

window.onunhandledrejection = function(event) {
  alert('Unhandled rejection: ' + event.reason);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
