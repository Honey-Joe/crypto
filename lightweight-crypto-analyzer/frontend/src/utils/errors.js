import api from '../services/api';

/** Turns an Axios error into a message a user can act on. */
export function getErrorMessage(error) {
  const serverMessage = error?.response?.data?.error?.message;
  if (serverMessage) return serverMessage;
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. Try a smaller benchmark (fewer iterations or smaller messages).';
  }
  if (error?.request && !error?.response) {
    return `Cannot reach the backend at ${api.defaults.baseURL}. Start it with "cd backend && npm run dev" and check VITE_API_URL.`;
  }
  if (error?.response) return `The server responded with HTTP ${error.response.status}.`;
  return error?.message || 'Something went wrong.';
}

/** Machine-readable error code from the API, if any. */
export function getErrorCode(error) {
  return error?.response?.data?.error?.code ?? null;
}
