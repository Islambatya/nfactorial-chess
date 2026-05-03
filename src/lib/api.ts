/**
 * Utility to get the dynamic backend URLs based on the environment.
 * Supports Antigravity's cloud IDE port mapping.
 */

export const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  const host = window.location.hostname;
  
  // If we are on localhost, assume the backend is on port 8000
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}:8000`;
  }
  
  // Antigravity specific: if we are on a port-mapped URL (e.g., -5173.antigravity.run),
  // replace the port segment to point to the backend port (8000).
  if (host.includes('-5173.')) {
    return `${window.location.protocol}//${host.replace('-5173.', '-8000.')}`;
  }

  // Fallback to relative path if everything else fails, or assume same host port 8000
  return `${window.location.protocol}//${host}:8000`;
};

export const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  
  const host = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (host === 'localhost' || host === '127.0.0.1') {
    return `${protocol}//${host}:8000`;
  }
  
  if (host.includes('-5173.')) {
    return `${protocol}//${host.replace('-5173.', '-8000.')}`;
  }
  
  return `${protocol}//${host}:8000`;
};
