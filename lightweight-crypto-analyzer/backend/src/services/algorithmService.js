import { ALGORITHMS, ALGORITHM_IDS, findAlgorithm } from '../algorithms/index.js';
import { ALGORITHM_INFO, REVIEW_TABLE_NOTE, REVIEW_TABLE_SOURCE } from '../data/algorithmInfo.js';
import { findReference } from '../data/references.js';
import { MODES } from '../modes/blockModes.js';
import { NotFoundError, UnavailableError, ValidationError } from '../utils/errors.js';
import { getSelfTestReport, isVariantVerified } from './selfTestService.js';

/** Round-key storage for a variant, measured from the typed arrays the cipher allocates. */
function roundKeyBytes(algorithm, variant) {
  return algorithm.createCipher(variant.id, new Uint8Array(variant.keyBits / 8)).roundKeyBytes;
}

function describeVariant(algorithm, variant, selfTest) {
  const status = selfTest.variants[variant.id];
  return {
    id: variant.id,
    name: variant.name,
    blockBits: variant.blockBits,
    keyBits: variant.keyBits,
    keyHexLength: variant.keyBits / 4,
    wordBits: variant.wordBits ?? null,
    rounds: variant.rounds,
    roundsNote: variant.roundsNote ?? null,
    roundKeyBytes: roundKeyBytes(algorithm, variant),
    isDefault: variant.id === algorithm.defaultVariant,
    verified: status.verified,
    selfTest: status,
  };
}

function implementationStatus(selfTest) {
  if (selfTest.allVariantsVerified) return 'verified';
  if (selfTest.anyVariantVerified) return 'partially-verified';
  return 'failed-self-test';
}

function summarizeAlgorithm(algorithm) {
  const info = ALGORITHM_INFO[algorithm.id];
  const selfTest = getSelfTestReport().algorithms[algorithm.id];
  return {
    id: algorithm.id,
    name: algorithm.name,
    fullName: info.fullName,
    family: info.family,
    year: info.year,
    designers: info.designers,
    summary: info.summary,
    byteOrder: algorithm.byteOrder,
    defaultVariant: algorithm.defaultVariant,
    variants: Object.values(algorithm.variants).map((variant) => describeVariant(algorithm, variant, selfTest)),
    implementationStatus: implementationStatus(selfTest),
    selfTest: {
      checkedAt: selfTest.checkedAt,
      vectorsTotal: selfTest.vectorsTotal,
      vectorsPassed: selfTest.vectorsPassed,
    },
  };
}

export function listAlgorithms() {
  return ALGORITHM_IDS.map((id) => summarizeAlgorithm(ALGORITHMS[id]));
}

export function getAlgorithmDetail(name) {
  const algorithm = findAlgorithm(name);
  if (!algorithm) throw new NotFoundError(`Algorithm "${name}" is not implemented. Available: ${ALGORITHM_IDS.join(', ')}.`);
  const info = ALGORITHM_INFO[algorithm.id];
  const selfTest = getSelfTestReport().algorithms[algorithm.id];
  return {
    ...summarizeAlgorithm(algorithm),
    reviewCategory: info.reviewCategory,
    standardization: info.standardization,
    principle: info.principle,
    useCases: info.useCases,
    implementationNotes: info.implementationNotes,
    securityNotes: info.securityNotes,
    literature: {
      ...info.literature,
      tableSource: REVIEW_TABLE_SOURCE,
      tableNote: REVIEW_TABLE_NOTE,
    },
    references: info.references.map(findReference).filter(Boolean),
    testVectors: selfTest.vectors,
  };
}

export function listModes() {
  return Object.values(MODES);
}

/**
 * Resolves an { algorithm, variant } pair from request input. Throws a 400 for unknown
 * names and a 503 for variants that failed their self-test.
 */
export function resolveTarget(algorithmName, variantId) {
  const algorithm = findAlgorithm(algorithmName);
  if (!algorithm) {
    throw new ValidationError(
      `Unsupported algorithm "${algorithmName ?? ''}". Supported algorithms: ${ALGORITHM_IDS.join(', ')}.`,
      { field: 'algorithm', allowed: ALGORITHM_IDS },
    );
  }
  const requested = variantId === undefined || variantId === null || variantId === '' ? algorithm.defaultVariant : String(variantId).trim();
  const variant = algorithm.variants[requested];
  if (!variant) {
    const allowed = Object.keys(algorithm.variants);
    throw new ValidationError(
      `Unsupported ${algorithm.name} variant "${requested}". Supported variants: ${allowed.join(', ')}.`,
      { field: 'variant', allowed },
    );
  }
  if (!isVariantVerified(algorithm.id, variant.id)) {
    throw new UnavailableError(`${variant.name} is disabled because it did not pass its known-answer self-test.`);
  }
  return { algorithm, variant };
}
