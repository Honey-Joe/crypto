# Performance and Security Analysis of Lightweight Cryptographic Algorithms for IoT Devices

A full-stack academic mini project that implements four lightweight block ciphers (**PRESENT**, **SIMON**, **SPECK** and **XTEA**), verifies each one against published test vectors, measures their software performance under identical conditions, compares them visually, and simulates encrypted IoT sensor traffic.

The project is based on:

> Thakor, V. A., Razzaque, M. A., & Khandaker, M. R. A. (2021). "Lightweight Cryptography Algorithms for Resource-Constrained IoT Devices: A Review, Comparison and Research Opportunities." *IEEE Access*, 9, 28177–28193. DOI: [10.1109/ACCESS.2021.3052867](https://doi.org/10.1109/ACCESS.2021.3052867)

---

## Contents

1. [Abstract](#1-abstract)
2. [Problem statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Existing system](#4-existing-system)
5. [Proposed system](#5-proposed-system)
6. [System architecture](#6-system-architecture)
7. [Technology stack](#7-technology-stack)
8. [Module descriptions](#8-module-descriptions)
9. [Folder structure](#9-folder-structure)
10. [Installation](#10-installation)
11. [Frontend setup](#11-frontend-setup)
12. [Backend setup](#12-backend-setup)
13. [Environment variables](#13-environment-variables)
14. [API endpoint documentation](#14-api-endpoint-documentation)
15. [Example API requests](#15-example-api-requests)
16. [Running the tests](#16-running-the-tests)
17. [Benchmark methodology](#17-benchmark-methodology)
18. [Limitations](#18-limitations)
19. [Future enhancements](#19-future-enhancements)
20. [Research references](#20-research-references)
21. [Demonstrating the project to faculty](#21-demonstrating-the-project-to-faculty)
22. [Feature checklist and test results](#22-feature-checklist-and-test-results)

---

## 1. Abstract

IoT devices such as sensor nodes, RFID tags and smart cards must protect the data they collect, yet they have very little memory, processing power, silicon area and energy. Lightweight block ciphers are designed for these constraints. This project implements PRESENT, SIMON, SPECK and XTEA as a Node.js/Express service, checks every implementation against published known-answer test vectors, and provides a React dashboard to encrypt and decrypt data, benchmark the algorithms under identical conditions, compare them with charts and a weighted recommendation, and simulate encrypted IoT sensor traffic. Software measurements made by the application are kept separate from hardware figures reported in the literature, and the security limitations that performance numbers cannot reveal are explained throughout.

## 2. Problem statement

Conventional algorithms such as AES can be too expensive for the smallest IoT devices in gate count, code size or energy. Dozens of lightweight alternatives exist, but published comparisons combine figures measured on different hardware, ASIC technologies, compilers and cipher variants, so readers cannot reproduce them or see the trade-offs for themselves. Demonstrations are also often misleading: some use toy ciphers, substitute AES, or mistake encodings like Base64 for encryption. A tool is needed that runs real, verified implementations side by side under identical conditions and is honest about what software measurements can and cannot show.

## 3. Objectives

1. Study lightweight cryptography for resource-constrained IoT devices.
2. Implement PRESENT, SIMON, SPECK and XTEA and verify them against published test vectors.
3. Encrypt and decrypt user-provided messages.
4. Measure encryption and decryption times.
5. Calculate software throughput and ciphertext size.
6. Report memory statistics where meaningful.
7. Compare algorithms using identical inputs and identical conditions.
8. Present results through charts, tables and summary cards, with CSV/JSON export.
9. Simulate IoT sensor data encryption.
10. Explain the trade-offs between security, performance and resource consumption.

## 4. Existing system

- Comparisons of lightweight ciphers appear mainly as survey tables compiled from many separate studies (as in the reference paper's Table 3). The numbers come from different platforms and variants and cannot be reproduced by the reader.
- Teaching demos frequently use simplified or placeholder ciphers, or AES in place of the lightweight algorithm being discussed.
- Performance and security are often conflated: a faster cipher is presented as a "better" cipher.

## 5. Proposed system

- **Verified implementations.** Each cipher is implemented from its specification with a documented byte order. The server runs every known-answer vector at start-up and refuses to offer any variant that fails.
- **Reproducible measurements.** A documented benchmark methodology: identical plaintext per message size, separate key-setup timing, unmeasured warm-up, per-iteration `performance.now()` timing, and round-trip verification of every iteration.
- **Honest presentation.** Measured software results, literature hardware figures and security assessment are shown in separate, clearly labelled places. The dashboard never shows sample or invented data.
- **Practical context.** An IoT simulation shows the cost of encrypting real-sized sensor messages and the overhead added by IVs and padding.

## 6. System architecture

```
┌─────────────────────────── Browser (React + Vite, port 5173) ───────────────────────────┐
│  Pages: Dashboard · Encrypt/Decrypt · Benchmark · Comparison · IoT · Algorithms · About │
│  Components (Tailwind CSS, Recharts, Lucide)       Contexts: theme, toasts, algorithms,  │
│                                                    benchmark history (localStorage)      │
│  Service modules ── src/services/*.js ── Axios instance (src/services/api.js)            │
└──────────────────────────────────────────┬──────────────────────────────────────────────┘
                                           │ JSON over HTTP (VITE_API_URL)
┌──────────────────────────── Node.js + Express API (port 5000) ──────────────────────────┐
│  routes/ → middleware (CORS, JSON body, validation) → controllers/                       │
│  services/   encryptionService · benchmarkService · comparisonService · algorithmService │
│              selfTestService (known-answer tests at start-up) · iotService               │
│  modes/      CBC · CTR · ECB, PKCS#7 padding                                             │
│  algorithms/ present.js · simon.js · speck.js · xtea.js  (common cipher interface)       │
│  middleware/errorHandler.js → consistent JSON errors, no stack traces to clients         │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Every algorithm module exposes the same interface:
`createCipher(variantId, keyBytes) → { blockSize, roundKeyBytes, encryptBlock(), decryptBlock() }`.
The block-mode layer turns any such cipher into a message cipher, so the API, benchmark and tests treat all four algorithms identically.

No database is required. Benchmark history is stored in the browser's `localStorage`; the service layer is structured so persistent storage (e.g. MongoDB) can be added later without changing the algorithms or controllers.

## 7. Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), React Router DOM 7, Axios 1, Recharts 3, Lucide React |
| Backend | Node.js (≥ 22, tested on 24.18), Express 5 (ES modules), `cors`, `node:crypto` (random keys/IVs), `node:perf_hooks` (timing), `process.memoryUsage()` |
| Cryptography | Own JavaScript implementations of PRESENT, SIMON, SPECK, XTEA; CBC/CTR/ECB modes (NIST SP 800-38A); PKCS#7 padding |
| Testing | Node.js built-in test runner (`node:test`) — no extra test dependencies |
| Storage | None required; `localStorage` for benchmark history |

## 8. Module descriptions

### Dashboard
Shows the number of implemented (and verified) algorithms, total benchmark runs, the fastest measured encryption and decryption from the latest run, encryption-time and throughput charts, a performance summary table, the implemented-algorithm list with live self-test status, and recent history. Before any benchmark is run it shows an empty state — it never displays sample data.

### Encrypt / Decrypt
Choose algorithm, variant and mode (CBC default, CTR, or ECB for demonstration), enter or generate a hex key, type a message and encrypt it to hex or Base64. The result shows the ciphertext (with a copy button), the IV, padding added, raw and encoded sizes, and single-operation timings. "Decrypt this ciphertext" moves it to the Decrypt tab with the original text kept for verification; the server reports whether the recovered text matches byte-for-byte. Invalid keys, malformed ciphertext and padding failures produce clear errors. A side panel explains block size, padding, output layout, and why encryption does not provide integrity.

### Performance Benchmark
Select any combination of the nine variants, up to six message sizes (presets from 16 B to 256 KiB or custom), a dataset (random bytes, English text, IoT sensor JSON, or custom text), the number of measured and warm-up iterations, and the mode. Results include summary cards, encryption/decryption-time, throughput and ciphertext-size charts per message size, a throughput-vs-message-size chart, a detailed table (mean/median/min, key setup, ciphertext breakdown, round-key storage, heap growth, verification status), measurement warnings, the full test conditions and environment, CSV/JSON export, and a saved history.

### Algorithm Comparison
Filters in one row: benchmark run, message size, statistic (mean, median or minimum) and algorithms. Six charts (encryption time, decryption time, throughput, ciphertext size, memory — round-key storage or process heap growth — and key setup), a detailed table, and a **recommendation panel**. The panel calls `POST /api/compare` with preset or custom weights and shows the best overall result, per-metric winners (with ties), close calls within 5%, comparability warnings, excluded results, and security considerations. It states explicitly that the ranking is not a security ranking.

### IoT Simulation
A simulated device (`SENSOR-001`) produces temperature, humidity, soil-moisture and air-quality readings via a bounded random walk on the server. The reading is serialised as compact JSON or a semicolon-separated compact format, encrypted (device side), shown as ciphertext on the "channel", decrypted (gateway side) and verified field by field. Timings, throughput and ciphertext overhead are displayed, and an auto-transmit mode sends a reading every 3 seconds into a packet log. The page is clearly labelled as a software simulation.

### Algorithm Information
One page per algorithm: designers and year, family, operating principle, intended use cases, a variant table (block/key/word size, rounds, round-key storage, verification status), **literature figures** from the reference review (hardware and microcontroller metrics) shown separately from **measurements made by this application**, implementation notes, security limitations, the live known-answer test table, and references.

### About Project
Abstract, problem statement, objectives, existing and proposed system, methodology, technology stack, modules, limitations, future enhancements, a summary of the reference paper in our own words, and the bibliography.

## 9. Folder structure

```
lightweight-crypto-analyzer/
├── README.md
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── scripts/selftest.js            # prints the known-answer test report
│   ├── src/
│   │   ├── server.js                  # runs self-tests, starts the HTTP server
│   │   ├── app.js                     # Express app (CORS, JSON, routes, errors)
│   │   ├── config.js                  # environment variables and limits
│   │   ├── algorithms/                # present.js, simon.js, speck.js, xtea.js, index.js
│   │   ├── modes/                     # blockModes.js (CBC/CTR/ECB), padding.js (PKCS#7)
│   │   ├── controllers/               # thin HTTP handlers
│   │   ├── routes/index.js            # all /api routes
│   │   ├── services/                  # encryption, benchmark, comparison, algorithm, selfTest, iot
│   │   ├── validators/                # benchmark and compare request validation
│   │   ├── middleware/                # error handler, request logger, JSON-body check
│   │   ├── data/                      # algorithm descriptions, references
│   │   └── utils/                     # bytes, encoding, errors, stats, environment
│   └── tests/                         # node:test suites (88 tests)
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── layouts/AppLayout.jsx
        ├── pages/                     # Dashboard, EncryptDecrypt, Benchmark, Comparison, IoTSimulation,
        │                              # AlgorithmInfo, AlgorithmDetail, About, NotFound
        ├── components/
        │   ├── layout/                # Sidebar, Header, navigation
        │   ├── ui/                    # Button, Card, MetricCard, InputField, SelectField, Badge, ...
        │   ├── charts/                # ChartContainer, MetricBarChart, ResultBarChart, SizeLineChart, ...
        │   ├── tables/ResultsTable.jsx
        │   ├── crypto/                # AlgorithmPicker, KeyField
        │   ├── benchmark/             # RunSummary, RunDetails, HistoryList, ExportButtons
        │   └── comparison/RecommendationPanel.jsx
        ├── context/                   # theme, toast, algorithms, benchmark-history providers
        ├── hooks/                     # useAppContext, useBackendHealth, useChartTheme, useCipherSelection
        ├── services/                  # api.js + algorithm/encryption/benchmark/comparison/iot/system services
        └── utils/                     # formatting, export, validation, storage, constants
```

## 10. Installation

Requirements: **Node.js 22 or newer** (tested with Node.js 24.18 and npm 11) and a modern browser. Node.js 20 is not supported: the test script relies on glob patterns in `node --test`, added in Node.js 21.

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev          # http://localhost:5000/api

# Terminal 2 — frontend
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Open http://localhost:5173. The header shows **API online** when the frontend can reach the backend.

No extra Tailwind set-up command is needed: Tailwind CSS 4 is loaded through the `@tailwindcss/vite` plugin (see `vite.config.js`) and `@import 'tailwindcss';` in `src/index.css`.

## 11. Frontend setup

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 5173 with hot reload |
| `npm run build` | Production build into `frontend/dist` |
| `npm run preview` | Serve the production build locally |

The API URL comes from `VITE_API_URL`; if unset it defaults to `http://localhost:5000/api`. All HTTP calls go through the Axios instance in `src/services/api.js` and the service modules beside it; components never call Axios directly.

## 12. Backend setup

| Command | Purpose |
|---|---|
| `npm run dev` | Start with `node --watch --expose-gc` (restarts on file changes) |
| `npm start` | Start without watching |
| `npm test` | Run all automated tests |
| `npm run selftest` | Print every known-answer test vector and its result |

On start-up the server prints the self-test result, for example:

```
[self-test] PRESENT: 8/8 vectors passed (80 verified, 128 verified)
[self-test] SIMON: 3/3 vectors passed (32/64 verified, 64/96 verified, 64/128 verified)
[self-test] SPECK: 3/3 vectors passed (32/64 verified, 64/96 verified, 64/128 verified)
[self-test] XTEA: 7/7 vectors passed (64/128 verified)
Lightweight Crypto Analyzer API listening on http://localhost:5000/api
```

`--expose-gc` lets the benchmark force a garbage collection before each measurement, which makes the memory statistics steadier. If port 5000 is busy (for example by macOS AirPlay), set `PORT` in `backend/.env` and `VITE_API_URL` in `frontend/.env` accordingly.

## 13. Environment variables

Copy the `.env.example` files to `.env` only if you need to change the defaults. Never commit `.env` files.

**backend/.env**

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `5000` | API port |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated origins allowed by CORS |
| `MAX_PLAINTEXT_BYTES` | `65536` | Largest message accepted by `/encrypt` and `/decrypt` |
| `LOG_REQUESTS` | `true` | One log line per request (method, path, status, duration). Bodies — keys, plaintext, ciphertext — are never logged. |

**frontend/.env**

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Base URL of the Express API |

## 14. API endpoint documentation

Base URL: `http://localhost:5000/api`. Request and response bodies are JSON. Successful responses contain `"success": true`; errors use

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "field": "key" } } }
```

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Server status |
| GET | `/algorithms` | Algorithms, variants, live self-test status, modes |
| GET | `/algorithms/:id` | Full details for one algorithm, including known-answer test results and literature figures |
| POST | `/keys` | Generate a random key for an algorithm/variant |
| POST | `/encrypt` | Encrypt UTF-8 plaintext |
| POST | `/decrypt` | Decrypt ciphertext (optionally verify against the original) |
| GET | `/benchmark/options` | Benchmark defaults, datasets and limits |
| POST | `/benchmark` | Run a benchmark |
| POST | `/compare` | Rank benchmark results and produce a recommendation |
| GET | `/references` | Bibliography and paper summary |
| GET | `/iot/reading?deviceId=SENSOR-001` | Next simulated sensor reading |
| GET | `/environment` | Node.js, OS and CPU information |
| GET | `/self-test` | Full known-answer self-test report |

### Algorithms, variants and key formats

| `algorithm` | `variant` values (default in bold) | Block | Key (hex characters) | Rounds | Byte order |
|---|---|---|---|---|---|
| `PRESENT` | **`80`**, `128` | 64 bits | 20 or 32 | 31 + final key addition | big-endian, as in the PRESENT paper |
| `SIMON` | `32/64`, `64/96`, **`64/128`** | 32 or 64 bits | 16, 24 or 32 | 32, 42, 44 | little-endian words (NSA Implementation Guide) |
| `SPECK` | `32/64`, `64/96`, **`64/128`** | 32 or 64 bits | 16, 24 or 32 | 22, 26, 27 | little-endian words (NSA Implementation Guide) |
| `XTEA` | **`64/128`** | 64 bits | 32 | 64 Feistel rounds (32 cycles) | big-endian 32-bit words |

- **Keys** are hexadecimal strings of exactly the length above (whitespace and a `0x` prefix are ignored).
- **Plaintext** is a UTF-8 string, 1 to 65,536 bytes.
- **Modes:** `CBC` (default; random IV, PKCS#7 padding), `CTR` (random initial counter block, no padding), `ECB` (PKCS#7, no IV — insecure, for demonstration only).
- **Ciphertext layout:** `IV ‖ ciphertext` for CBC and CTR; just the ciphertext for ECB. Encoded as `hex` or `base64` (standard alphabet with `=` padding).

### Status codes

| Code | When |
|---|---|
| 200 | Success |
| 400 `VALIDATION_ERROR` / `INVALID_JSON` | Missing or invalid fields, unsupported algorithm/variant/mode/format, wrong key length, bad hex/Base64, size limits exceeded, non-JSON body |
| 404 `NOT_FOUND` | Unknown route or algorithm |
| 413 `PAYLOAD_TOO_LARGE` | Request body over 2 MB |
| 422 `INVALID_PADDING` / `INVALID_CIPHERTEXT_LENGTH` | Well-formed request but the ciphertext cannot be decrypted (wrong key/mode, or modified ciphertext) |
| 503 `ALGORITHM_UNAVAILABLE` | Variant disabled because it failed its self-test |
| 500 `INTERNAL_ERROR` | Unexpected error (no internal details are returned) |

### Benchmark request fields

| Field | Default | Limits |
|---|---|---|
| `targets` | one default variant of every algorithm | 1–9 objects `{ "algorithm", "variant" }` |
| `messageSizes` | `[1024]` | 1–6 sizes, each 1–262,144 bytes |
| `iterations` | `200` | 1–2,000 measured iterations |
| `warmupIterations` | `50` | 0–500 |
| `mode` | `CBC` | `CBC`, `CTR`, `ECB` |
| `dataset` | `random` | `random`, `text`, `sensor`, `custom` (+ `customText`, ≤ 4,096 chars) |

To keep runs short, `messageSize × (iterations + warmupIterations)` may not exceed 4 MiB per algorithm; the error message tells you the largest allowed iteration count.

## 15. Example API requests

**Encrypt**

```bash
curl -X POST http://localhost:5000/api/encrypt \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"XTEA","plaintext":"Temperature=32C","key":"000102030405060708090a0b0c0d0e0f","outputFormat":"hex"}'
```

Response (the IV is random, so your ciphertext will differ):

```json
{
  "success": true,
  "algorithm": "XTEA",
  "variant": "64/128",
  "displayName": "XTEA-64/128",
  "mode": "CBC",
  "padding": "PKCS#7",
  "layout": "IV || ciphertext",
  "outputFormat": "hex",
  "ciphertext": "e97ea7af233442d6fbad02cf66155e05561bd1bf4a2fcd5b",
  "iv": "e97ea7af233442d6",
  "sizes": { "blockBytes": 8, "plaintextBytes": 15, "paddingBytes": 1, "ivBytes": 8, "rawCiphertextBytes": 24, "encodedCiphertextChars": 48 },
  "timing": { "keySetupMs": 0.0133, "encryptionMs": 0.0083, "throughputBytesPerSec": 1807228.9, "note": "Single operation timed on the server …" },
  "warnings": ["CBC provides confidentiality only. It does not detect modification of the ciphertext."]
}
```

**Decrypt and verify**

```bash
curl -X POST http://localhost:5000/api/decrypt \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"XTEA","ciphertext":"e97ea7af233442d6fbad02cf66155e05561bd1bf4a2fcd5b","key":"000102030405060708090a0b0c0d0e0f","inputFormat":"hex","expectedPlaintext":"Temperature=32C"}'
```

```json
{ "success": true, "plaintext": "Temperature=32C", "validUtf8": true,
  "verification": { "matches": true, "message": "Recovered plaintext is byte-for-byte identical to the original." }, "…": "…" }
```

**Wrong key (CBC padding check fails)**

```json
{ "success": false, "error": { "code": "INVALID_PADDING", "message": "Invalid PKCS#7 padding after decryption. The key, algorithm, variant or mode probably does not match the one used for encryption, or the ciphertext was modified." } }
```

**Generate a key**

```bash
curl -X POST http://localhost:5000/api/keys -H "Content-Type: application/json" -d '{"algorithm":"PRESENT","variant":"128"}'
```

**Run a benchmark**

```bash
curl -X POST http://localhost:5000/api/benchmark \
  -H "Content-Type: application/json" \
  -d '{"targets":[{"algorithm":"PRESENT","variant":"80"},{"algorithm":"SIMON","variant":"64/128"},{"algorithm":"SPECK","variant":"64/128"},{"algorithm":"XTEA"}],"messageSizes":[64,4096],"iterations":200,"warmupIterations":50,"mode":"CBC","dataset":"sensor"}'
```

Each entry of `results` contains `encrypt`, `decrypt` and `keySetup` statistics (`meanMs`, `medianMs`, `minMs`, `maxMs`, `stdDevMs`), `throughput` (bytes/s), `ciphertext` (raw bytes, IV, padding, hex and Base64 lengths), `memory` (round-key bytes, lookup-table bytes, process heap figures), `roundTrip` verification, `warnings` and the `conditions` under which it was measured.

**Compare results**

```bash
curl -X POST http://localhost:5000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"results": [ …results array from /benchmark… ], "statistic": "median",
       "weights": {"encryption":35,"decryption":35,"keySetup":10,"ciphertextSize":10,"roundKeyMemory":10}}'
```

The response groups results by message size and returns per-metric winners (with ties), a weighted overall ranking, a recommendation, comparability warnings, excluded results and security context.

## 16. Running the tests

```bash
cd backend
npm test            # all automated tests (node:test)
npm run selftest    # human-readable known-answer test report
```

The suites cover:

| File | What it tests |
|---|---|
| `xtea.test.js` | 7 published vectors; precomputed key schedule vs the original reference formula; random round trips; invalid keys/variants |
| `present.test.js` | 4 PRESENT-80 vectors from the paper, 4 PRESENT-128 vectors; S-box/P-layer properties; table-based fast path vs bit-level reference; round trips; key schedule; invalid keys |
| `simon-speck.test.js` | Paper vectors for all six variants; byte-order conversion vs the Implementation Guide; round counts and round-key sizes; round trips; invalid keys/variants |
| `modes.test.js` | PKCS#7 padding and malformed padding; every variant × mode × lengths 1–40 round trip; CBC first block equals the KAT; CTR keystream vs ECB of counters (with carry); ECB pattern leakage; random IVs; invalid ciphertext lengths; wrong-key detection rate |
| `utils.test.js` | Strict hex/Base64 parsing, unknown formats, UTF-8 validity; statistics (mean/median/min/max/std-dev); throughput formula |
| `benchmark.test.js` | Request validation and limits; dataset sizes; a real benchmark run (statistics consistency, throughput = size / mean, ciphertext sizes incl. IV and padding, conditions); failed round trips excluded from comparison |
| `comparison.test.js` | Winners, ties, statistic selection, weights, security context, grouping by size, comparability warnings, close calls; compare request validation |
| `api.test.js` | Every endpoint over real HTTP: all 9 variants × 3 modes × 2 formats round trip, IV handling, wrong key, verification mismatch, invalid keys/ciphertext/formats/sizes, unsupported algorithms, invalid JSON, key generation, benchmark and compare, limits, 404s, no stack traces in errors |

## 17. Benchmark methodology

1. **Identical input.** For each message size, one plaintext buffer is generated and used by every algorithm in the run.
2. **Comparable configuration.** All algorithms in a run use the same mode, dataset, measured iterations and warm-up iterations. A random key (and IV) is generated per algorithm; the IV is reused across iterations so every iteration does identical work (acceptable for timing only — never for real data).
3. **Key setup measured separately.** Round-key expansion is timed on its own and never included in encryption or decryption time.
4. **Warm-up.** Before any measurement, every selected algorithm runs an unmeasured warm-up pass (at least 300 iterations and 256 KiB, capped at 1 MiB), then each algorithm runs its own warm-up iterations immediately before it is measured. Without the global pass, the first algorithm in a run was measured while the shared mode code was still unoptimised.
5. **High-resolution timing.** Each iteration is timed individually with `performance.now()` from `node:perf_hooks` (monotonic). The timer's resolution and call overhead are measured and reported; results whose median is within 50× the resolution are flagged as quantised.
6. **Statistics.** Mean, median, minimum, maximum and sample standard deviation for encryption, decryption and key setup.
7. **Throughput** = plaintext bytes ÷ mean time in seconds (bytes/s; shown as KB/s or MB/s with 1 MB = 10⁶ bytes). The comparison page can recompute it from the median or minimum.
8. **Ciphertext size** is reported as raw bytes (including IV and padding) and as hex/Base64 character counts.
9. **Memory.** Round-key storage and lookup-table sizes are the exact sizes of the typed arrays each implementation allocates. Heap and RSS figures come from `process.memoryUsage()` for the whole process (after a forced GC when available); they are indicative only.
10. **Verification.** Every measured ciphertext must equal the reference ciphertext and every decryption must reproduce the plaintext. Any mismatch marks the result as failed; failed results are excluded from rankings and summaries.
11. **Environment recorded.** Node.js/V8 version, OS, CPU model, core count, timer resolution and GC availability are stored with every run, and the comparison service warns when results with different conditions are compared.

Results depend on the CPU, operating system, Node.js version, JIT optimisation, background load and the quality of each JavaScript implementation. **No hardware metric** (gate equivalents, circuit area, power or energy) is measured by this application; those figures appear only on the Algorithm Information pages, labelled as literature values.

## 18. Limitations

- Software timings of JavaScript implementations on a general-purpose computer do not represent microcontroller or hardware performance.
- Process memory statistics include the runtime and HTTP server; they are not algorithm-specific.
- CBC, CTR and ECB give confidentiality only; there is no authentication or integrity protection. ECB is included only to demonstrate its weakness.
- Small-block variants (SIMON-32/64, SPECK-32/64) are unsuitable for more than about 2¹⁶ blocks (256 KiB) per key; 64-bit-block ciphers should change keys well before 2³² blocks.
- Only the 32- and 64-bit block variants of SIMON and SPECK are implemented.
- The implementations are not hardened against side channels (PRESENT uses secret-indexed lookup tables).
- Distinct padding errors would form a padding oracle on a public service; acceptable for a local teaching tool only.
- Benchmarks run on the single JavaScript thread, so the API is busy during a run.
- Literature figures were transcribed from the arXiv version of the reference review (arXiv:2006.13813); check Table 3 of the published IEEE Access version before quoting them.
- Benchmark history lives in the browser only and is not shared between machines.

## 19. Future enhancements

- Authenticated encryption: NIST Ascon-AEAD128 (SP 800-232), or a MAC over the existing ciphers.
- Measurements on real microcontrollers (ESP32, Arduino, ARM Cortex-M): cycles per byte, RAM/ROM and energy.
- The 48-, 96- and 128-bit block variants of SIMON and SPECK, and further ciphers (GIFT, LEA, TWINE, PRINCE).
- Bit-sliced / constant-time implementations and side-channel experiments.
- Optional MongoDB persistence for shared benchmark history.
- Worker threads for benchmarks so the API remains responsive.

## 20. Research references

1. V. A. Thakor, M. A. Razzaque and M. R. A. Khandaker, "Lightweight Cryptography Algorithms for Resource-Constrained IoT Devices: A Review, Comparison and Research Opportunities," *IEEE Access*, vol. 9, pp. 28177–28193, 2021, doi:10.1109/ACCESS.2021.3052867. (Preprint: "Lightweight Cryptography for IoT: A State-of-the-Art," arXiv:2006.13813, 2020.)
2. A. Bogdanov, L. R. Knudsen, G. Leander, C. Paar, A. Poschmann, M. J. B. Robshaw, Y. Seurin and C. Vikkelsoe, "PRESENT: An Ultra-Lightweight Block Cipher," CHES 2007, LNCS 4727, pp. 450–466, doi:10.1007/978-3-540-74735-2_31.
3. R. Beaulieu, D. Shors, J. Smith, S. Treatman-Clark, B. Weeks and L. Wingers, "The SIMON and SPECK Families of Lightweight Block Ciphers," IACR ePrint 2013/404.
4. U.S. National Security Agency, "SIMON and SPECK Implementation Guide," 2019, github.com/nsacyber/simon-speck.
5. D. J. Wheeler and R. M. Needham, "Tea extensions," Technical report, University of Cambridge Computer Laboratory, 1997.
6. M. Dworkin, "Recommendation for Block Cipher Modes of Operation: Methods and Techniques," NIST SP 800-38A, 2001.
7. R. Housley, "Cryptographic Message Syntax (CMS)," RFC 5652, 2009 (section 6.3, padding).
8. NIST, "Ascon-Based Lightweight Cryptography Standards for Constrained Devices," NIST SP 800-232, 2025.

Test-vector sources: PRESENT-80 — Appendix I of [2]; PRESENT-128 — the OpenTitan project's PRESENT tests (citing the Ruhr-Universität Bochum reference vectors); SIMON/SPECK — Appendices B and C of [3], byte order per [4]; XTEA — the Botan library's `xtea.vec` (also used by libtomcrypt).

### What the reference paper concludes (summarised in our own words)

The review groups more than fifty lightweight block ciphers by structure (SPN, Feistel, generalised Feistel, ARX, NLFSR, hybrid) and compares them with hardware metrics (gate equivalents, power, energy, throughput at 100 kHz) and software metrics (ROM, RAM, cycles per block, throughput at 4 MHz) compiled from earlier studies. SPECK is the most software-efficient in its comparison, followed by SIMON; ciphers such as PRESENT stand out in hardware. The authors observe that simple rounds favour hardware efficiency while fewer, simpler rounds favour software efficiency, that many lightweight ciphers have related-key or reduced-round attacks, and that cost, performance and security cannot all be optimised at once. Those conclusions come from the literature they surveyed; **this project's own results are software measurements on your machine and must not be mixed with them.**

## 21. Demonstrating the project to faculty

A 10-minute demonstration that shows every module:

1. **Start both servers** (section 10). Point out the backend console: every algorithm passes its known-answer tests before the API accepts requests.
2. **Dashboard** — note the empty state: no fake data is ever shown. Point to "9 of 9 variants verified".
3. **Encrypt / Decrypt**
   - Encrypt the default message with XTEA in CBC mode; show the IV prefix, the padding (15 → 16 bytes), and that encrypting again gives a different ciphertext (random IV).
   - Click **Decrypt this ciphertext** → **Decrypt** → "Matches original".
   - Change one key character and decrypt again → almost always "Decryption failed" (the padding check fails; about 1 time in 256 a wrong key passes it and yields garbage). Explain that this is luck, not integrity: CTR mode would silently return garbage instead.
   - Switch to ECB and encrypt `AAAAAAAAAAAAAAAA` to show identical ciphertext blocks.
   - Select SIMON-32/64 to show the 32-bit-block warning.
4. **Performance Benchmark** — run the default configuration (4 algorithms × 64 B / 1 KiB / 16 KiB). Discuss: SPECK fastest in software (consistent with the review), PRESENT slowest in software (its bit permutation is designed for hardware), and throughput rising with message size. Open "Test conditions" to show the environment and methodology. Export CSV.
5. **Algorithm Comparison** — switch the statistic to median, try the "Low memory" and "Low bandwidth" presets, and read the security-considerations box: the fastest cipher is not automatically the most secure.
6. **IoT Simulation** — encrypt a reading, compare JSON (≈130 B) with the compact format (≈35 B) and their ciphertext overhead, then start auto-transmit.
7. **Algorithm Information → PRESENT** — show literature hardware figures (1570 GE) next to this application's software measurements, and the live test-vector table.
8. **Tests** — run `npm test` in `backend` (88 passing tests).

## 22. Feature checklist and test results

| Requirement | Status |
|---|---|
| PRESENT-80/128, SIMON-32/64, 64/96, 64/128, SPECK-32/64, 64/96, 64/128, XTEA — real implementations | Done; all verified by published vectors |
| Known-answer tests, round-trip tests, invalid key/ciphertext tests | Done (22 vectors, 88 automated tests) |
| Encryption/decryption UI with key generation, hex/Base64, copy, verification, errors | Done |
| CBC/CTR/ECB modes, PKCS#7 padding, unauthenticated-mode warnings | Done |
| Benchmark: multi-algorithm, multi-size, datasets, iterations, warm-up, mean/median/min, throughput, ciphertext size, memory, round-trip verification, key setup timed separately | Done |
| Comparison charts (encryption, decryption, throughput, ciphertext size, memory, key setup), filters, table, recommendation | Done |
| CSV / JSON export | Done (Benchmark and Comparison pages) |
| IoT sensor simulation (temperature, humidity, soil moisture, air quality) | Done |
| Algorithm information pages with literature vs measured separation | Done |
| About page and references | Done |
| REST API with validation, consistent JSON, status codes, centralised error handling, CORS, limits, no secret logging, no stack traces | Done |
| Dark/light theme, responsive layout, toasts, loading/empty/error states | Done |
| Database | Not required; localStorage history (MongoDB left as a future enhancement) |

**Test results recorded during development** (Node.js 24.18.1, Windows 11):

```
npm test  →  tests 88 · suites 17 · pass 88 · fail 0
  api.test.js 19/19 · benchmark.test.js 11/11 · comparison.test.js 9/9 · modes.test.js 11/11
  present.test.js 9/9 · simon-speck.test.js 16/16 · utils.test.js 7/7 · xtea.test.js 6/6
npm run selftest  →  22/22 known-answer vectors passed; 9/9 variants verified
npm run build (frontend)  →  succeeds
```

Re-run these commands on your own machine; the numbers above are a record of one run, not a guarantee.
