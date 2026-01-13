import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./sentry";

// #region agent log
const logDebug = (location: string, message: string, data: any, hypothesisId: string) => {
  const logData = {location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId};
  console.log(`[DEBUG ${hypothesisId}]`, location, message, data);
  fetch('http://127.0.0.1:7243/ingest/9504a544-9592-4c7b-afe6-b49cb5e62f9f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e)=>console.error('Log fetch failed:',e));
};
// #endregion

// #region agent log
logDebug('main.tsx', 'App initialization starting', { url: window.location.href, timestamp: Date.now() }, 'H3');

// Track if this is a reload
if (sessionStorage.getItem('main-tsx-loaded')) {
  logDebug('main.tsx', 'DETECTED RELOAD - main.tsx loaded before!', { 
    previousLoad: sessionStorage.getItem('main-tsx-loaded'),
    currentTime: Date.now()
  }, 'H4');
} else {
  sessionStorage.setItem('main-tsx-loaded', Date.now().toString());
  logDebug('main.tsx', 'First load of main.tsx', {}, 'H3');
}
// #endregion

// Initialize Sentry before rendering app
initSentry();

// #region agent log
logDebug('main.tsx', 'Creating React root', {}, 'H3');
// #endregion

const root = createRoot(document.getElementById("root")!);

// #region agent log
logDebug('main.tsx', 'Rendering App component', {}, 'H3');

// Catch unhandled errors (don't override console.error as it interferes with Vite)
window.addEventListener('error', (event) => {
  logDebug('main.tsx', 'Window error', { message: event.message, filename: event.filename, lineno: event.lineno }, 'H7');
}, true);

window.addEventListener('unhandledrejection', (event) => {
  logDebug('main.tsx', 'Unhandled promise rejection', { reason: event.reason?.toString() }, 'H7');
});
// #endregion

root.render(<App />);

// #region agent log
logDebug('main.tsx', 'App rendered', {}, 'H3');

// Monitor for page reloads (without overriding - just track)
let reloadCount = 0;
const checkForReload = () => {
  const currentUrl = window.location.href;
  setTimeout(() => {
    if (window.location.href !== currentUrl) {
      reloadCount++;
      logDebug('main.tsx', 'Page URL changed (possible reload)', { reloadCount, newUrl: window.location.href }, 'H4');
    }
  }, 100);
};
checkForReload();
// #endregion
