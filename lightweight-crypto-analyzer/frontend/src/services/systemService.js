import api from './api';

export async function getHealth() {
  const { data } = await api.get('/health', { timeout: 5000 });
  return data;
}

/** Bibliography plus a summary of the reference paper. */
export async function getReferences() {
  const { data } = await api.get('/references');
  return data;
}
