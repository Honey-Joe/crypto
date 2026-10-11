import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAlgorithms } from '../services/algorithmService';
import { getErrorMessage } from '../utils/errors';
import { AlgorithmsContext } from './contexts';

/** Loads the algorithm list once and shares it with every page. */
export default function AlgorithmsProvider({ children }) {
  const [state, setState] = useState({ algorithms: [], modes: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const { algorithms, modes } = await getAlgorithms();
      setState({ algorithms, modes, loading: false, error: null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => {
    const findAlgorithm = (id) => state.algorithms.find((algorithm) => algorithm.id === id);
    const findVariant = (algorithmId, variantId) => findAlgorithm(algorithmId)?.variants.find((variant) => variant.id === variantId);
    return { ...state, reload: load, findAlgorithm, findVariant };
  }, [state, load]);

  return <AlgorithmsContext.Provider value={value}>{children}</AlgorithmsContext.Provider>;
}
