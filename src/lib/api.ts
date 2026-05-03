/**
 * Utility to get the dynamic backend URLs based on the environment.
 * Now uses relative paths to leverage the Vite dev server proxy.
 */

export const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  // Use relative path so Vite proxy handles it
  return "";
};

export const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Use current host for WebSocket, handled by Vite proxy
  return `${protocol}//${window.location.host}`;
};
