import api from './api';

/**
 * Ranks benchmark results on the server and returns a performance-based recommendation.
 * @param {{results: object[], statistic?: 'mean'|'median'|'min', weights?: Record<string, number>}} request
 */
export async function compareResults(request) {
  const { data } = await api.post('/compare', request);
  return data;
}
