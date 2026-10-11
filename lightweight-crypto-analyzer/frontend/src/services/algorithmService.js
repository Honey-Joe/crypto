import api from './api';

/** Lists the implemented algorithms, their variants, self-test status and block modes. */
export async function getAlgorithms() {
  const { data } = await api.get('/algorithms');
  return { algorithms: data.algorithms, modes: data.modes };
}

/** Full information for one algorithm, including its known-answer test results. */
export async function getAlgorithm(id) {
  const { data } = await api.get(`/algorithms/${encodeURIComponent(id)}`);
  return data.algorithm;
}
