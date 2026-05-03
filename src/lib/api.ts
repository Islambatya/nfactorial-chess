/**
 * Utility to get the dynamic backend URLs based on the environment.
 * Ensures the app connects to the FastAPI backend (usually on port 8000)
 * rather than the Vite frontend port.
 */

export const getApiUrl = () => {
  // 1. Check for environment variable
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  const host = window.location.hostname;
  
  // 2. Local development fallback
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}:8000`;
  }
  
  // 3. Antigravity/Cloud environment dynamic port mapping
  if (host.includes('-5173.')) {
    return `${window.location.protocol}//${host.replace('-5173.', '-8000.')}`;
  }

  // 4. Fallback: try port 8000 on current host
  return `${window.location.protocol}//${host}:8000`;
};

export const getWsUrl = () => {
  // 1. Check for environment variable
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  
  const host = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // 2. Local development fallback
  if (host === 'localhost' || host === '127.0.0.1') {
    return `${protocol}//${host}:8000`;
  }
  
  // 3. Antigravity/Cloud environment dynamic port mapping
  if (host.includes('-5173.')) {
    return `${protocol}//${host.replace('-5173.', '-8000.')}`;
  }
  
  // 4. Fallback: try port 8000 on current host
  return `${protocol}//${host}:8000`;
};
