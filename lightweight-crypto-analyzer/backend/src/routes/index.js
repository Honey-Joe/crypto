import { Router } from 'express';
import { getAlgorithm, getAlgorithms } from '../controllers/algorithmController.js';
import { getBenchmarkOptions, postBenchmark } from '../controllers/benchmarkController.js';
import { postCompare } from '../controllers/comparisonController.js';
import { createKey, decrypt, encrypt } from '../controllers/cryptoController.js';
import { getReading } from '../controllers/iotController.js';
import { getEnvironment, getHealth, getReferences, getSelfTest } from '../controllers/systemController.js';
import { requireJsonObjectBody } from '../middleware/validateRequest.js';

const router = Router();

// System
router.get('/health', getHealth);
router.get('/environment', getEnvironment);
router.get('/references', getReferences);
router.get('/self-test', getSelfTest);

// Algorithms
router.get('/algorithms', getAlgorithms);
router.get('/algorithms/:id', getAlgorithm);

// Cryptographic operations
router.post('/keys', requireJsonObjectBody, createKey);
router.post('/encrypt', requireJsonObjectBody, encrypt);
router.post('/decrypt', requireJsonObjectBody, decrypt);

// Benchmarking and comparison
router.get('/benchmark/options', getBenchmarkOptions);
router.post('/benchmark', requireJsonObjectBody, postBenchmark);
router.post('/compare', requireJsonObjectBody, postCompare);

// IoT simulation
router.get('/iot/reading', getReading);

export default router;
