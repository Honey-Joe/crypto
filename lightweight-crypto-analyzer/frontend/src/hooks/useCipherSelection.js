import { useCallback, useEffect, useRef, useState } from 'react';
import { generateKey } from '../services/encryptionService';
import { getErrorMessage } from '../utils/errors';
import { useAlgorithms, useToast } from './useAppContext';

/**
 * Algorithm / variant / mode / key state shared by the Encrypt and IoT pages.
 * A random key is generated (server-side) whenever the current key does not fit the
 * selected variant, so the user can encrypt straight away.
 */
export default function useCipherSelection(initialAlgorithm = 'XTEA') {
  const { algorithms, findVariant } = useAlgorithms();
  const toast = useToast();
  const [selection, setSelection] = useState({ algorithm: initialAlgorithm, variant: null });
  const [mode, setMode] = useState('CBC');
  const [key, setKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const keyRef = useRef(key);

  // Kept in a ref so changing the variant can check the key without re-running on every keystroke.
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Pick the default variant once the algorithm list has loaded.
  useEffect(() => {
    if (selection.variant || algorithms.length === 0) return;
    const algorithm = algorithms.find((item) => item.id === selection.algorithm) ?? algorithms[0];
    setSelection({ algorithm: algorithm.id, variant: algorithm.defaultVariant });
  }, [algorithms, selection]);

  const variant = selection.variant ? findVariant(selection.algorithm, selection.variant) : undefined;
  const expectedHexLength = variant?.keyHexLength ?? 32;

  const regenerateKey = useCallback(async () => {
    if (!selection.variant) return;
    setGenerating(true);
    try {
      setKey(await generateKey(selection.algorithm, selection.variant));
    } catch (error) {
      toast.error('Could not generate a key', getErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  }, [selection, toast]);

  useEffect(() => {
    if (!variant) return;
    if (keyRef.current.replace(/\s+/g, '').length !== variant.keyHexLength) regenerateKey();
  }, [variant, regenerateKey]);

  return {
    algorithm: selection.algorithm,
    variantId: selection.variant,
    variant,
    setSelection,
    mode,
    setMode,
    key,
    setKey,
    expectedHexLength,
    regenerateKey,
    generating,
  };
}
