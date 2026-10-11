/**
 * Descriptive information shown on the Algorithm Information page.
 *
 * Two kinds of content are kept separate on purpose:
 *   - literature: statements and figures reported in published work (mainly the reference
 *     review by Thakor, Razzaque & Khandaker). Hardware figures (GE, power, energy) can
 *     NOT be measured by this application.
 *   - everything measured by this application comes from the /api/benchmark endpoint at
 *     run time and is never stored here.
 *
 * Table 3 figures were transcribed from the arXiv version of the review
 * (arXiv:2006.13813, "Lightweight Cryptography for IoT: A State-of-the-Art"), which the
 * same authors developed into the IEEE Access 2021 paper. The published version may
 * differ slightly; check Table 3 of the published paper before quoting these values.
 */

export const REVIEW_TABLE_SOURCE =
  'Thakor, Razzaque & Khandaker, review Table 3 "Hardware and Software performances of LWC algorithms" (transcribed from arXiv:2006.13813)';

export const REVIEW_TABLE_NOTE =
  'The review compiles these figures from earlier studies that used different platforms, ASIC technologies, clock frequencies and cipher variants. They describe hardware and microcontroller implementations and are not comparable with the JavaScript timings measured by this application.';

export const ALGORITHM_INFO = Object.freeze({
  PRESENT: {
    fullName: 'PRESENT: An Ultra-Lightweight Block Cipher',
    designers: 'A. Bogdanov, L. R. Knudsen, G. Leander, C. Paar, A. Poschmann, M. J. B. Robshaw, Y. Seurin, C. Vikkelsoe',
    year: 2007,
    family: 'Substitution-permutation network (SPN)',
    reviewCategory: 'SPN',
    standardization: 'Standardised in ISO/IEC 29192-2 (lightweight block ciphers).',
    summary:
      'A hardware-oriented 64-bit block cipher built from a single 4-bit S-box and a bit permutation. It is one of the most studied lightweight ciphers and a common baseline in lightweight-cryptography research.',
    principle: [
      'The 64-bit state passes through 31 identical rounds. Each round XORs a 64-bit round key into the state (addRoundKey), replaces each of the 16 nibbles using the same 4-bit S-box (sBoxLayer), and moves every bit to a new position with a fixed bit permutation (pLayer). A final round key is XORed after the last round.',
      'The key schedule keeps the 80- or 128-bit key in a register. For each round it takes the leftmost 64 bits as the round key, rotates the register by 61 bits, passes the top nibble(s) through the S-box and XORs in a 5-bit round counter.',
      'In hardware the bit permutation costs nothing but wiring, which is why PRESENT is so small. In software every bit has to be moved individually, so fast software implementations use precomputed tables, as this project does.',
    ],
    useCases: [
      'RFID tags and smart cards where silicon area is the main constraint',
      'Sensor nodes with dedicated hardware crypto blocks',
      'Teaching SPN design (S-box + permutation) with a very small specification',
    ],
    implementationNotes: [
      'Byte order is big-endian, matching the hex notation of the PRESENT paper.',
      'Encryption uses eight 256-entry tables that combine the S-box and the bit permutation; decryption uses inverse-permutation tables plus an inverse S-box byte table. Together the tables occupy about 32 KiB, which is a software speed/memory trade-off (a hardware implementation needs no tables).',
      'The tables are generated at start-up from bit-level reference functions that follow the specification, and the unit tests check the fast path against them.',
      'The key schedule uses JavaScript BigInt for clarity, which makes key setup slower than a word-oriented implementation would be.',
    ],
    literature: {
      reviewTable3: {
        hardware: { keyBits: 80, blockBits: 64, technologyUm: 0.18, areaGE: 1570, powerUW: 2.35, energyPerBit: 11.77, throughputKbps100kHz: 200, efficiencyKbpsPerKGE: 127.38 },
        software: { keyBits: 128, blockBits: 64, romBytes: 660, ramBytes: 0, latencyCyclesPerBlock: 10792, energyPerBit: 43.1, throughputKbps4MHz: 23.7, efficiencyKbpsPerKB: 35.91 },
      },
      observations: [
        'The review describes PRESENT as a hardware-efficient, ISO/IEC-approved SPN cipher with 80- and 128-bit key variants.',
        'It reports roughly 1000 GE for an encryption-only, ultra-lightweight implementation and 2520-3010 GE for implementations providing an adequate security level, citing earlier work.',
        'It notes that PRESENT needs many cycles in software because of its permutation layer, motivating improved variants.',
        'The review lists PRESENT among suitable algorithms for smart-agriculture sensors and industrial systems.',
      ],
    },
    securityNotes: [
      'Published cryptanalysis (e.g. biclique attacks) gives at most a marginal speed-up over exhaustive key search on the full 31 rounds; stronger attacks apply only to reduced-round versions. This is a summary of the literature, not a current security audit.',
      'An 80-bit key is below the 112-128-bit minimum generally recommended today for long-term protection; prefer PRESENT-128 where PRESENT is required.',
      'The 64-bit block means collisions become likely after about 2^32 blocks (32 GiB) under one key, so keys must be changed well before that.',
      'Table-based software implementations (including this one) are not constant-time and may leak key information through cache timing. Hardware implementations need masking against power analysis.',
    ],
    references: ['bogdanov2007', 'thakor2021'],
  },

  SIMON: {
    fullName: 'SIMON family of lightweight block ciphers',
    designers: 'R. Beaulieu, D. Shors, J. Smith, S. Treatman-Clark, B. Weeks, L. Wingers (U.S. National Security Agency)',
    year: 2013,
    family: 'Balanced Feistel network using AND, rotation and XOR',
    reviewCategory: 'Feistel network (FN)',
    standardization:
      'Proposed for ISO/IEC 29192-2; ISO/IEC rejected the SIMON and SPECK proposal in 2018 after concerns about the transparency of their design rationale.',
    summary:
      'A family of ten block/key-size combinations designed to be extremely small in hardware while remaining reasonable in software. Its round function uses only bitwise AND, XOR and fixed rotations.',
    principle: [
      'The block is split into two n-bit words (x, y). Each round computes f(x) = (x <<< 1 AND x <<< 8) XOR (x <<< 2) and replaces (x, y) with (y XOR f(x) XOR k_i, x).',
      'The AND gate is the only non-linear operation. Diffusion comes from the rotations and from repeating the simple round many times (32 to 72 rounds depending on the variant).',
      'The key schedule is linear: each new round key is computed from earlier key words with rotations, XORs, a constant and one bit of a fixed 62-bit sequence (z0..z4) that breaks symmetry between rounds.',
    ],
    useCases: [
      'Hardware-constrained devices such as RFID tags and small ASICs',
      'Sensor nodes and home appliances (listed in the review\'s application table)',
      'Situations where one cipher family must cover several block and key sizes',
    ],
    implementationNotes: [
      'Implemented variants: SIMON-32/64, SIMON-64/96 and SIMON-64/128. The 48-, 96- and 128-bit block variants are not implemented.',
      'Byte order follows the NSA SIMON and SPECK Implementation Guide (little-endian words; block bytes are y then x).',
      'Round keys are precomputed once per key and stored in a typed array (2 bytes per round for 16-bit words, 4 bytes for 32-bit words).',
    ],
    literature: {
      reviewTable3: {
        hardware: { keyBits: 96, blockBits: 48, technologyUm: 0.13, areaGE: 763, powerUW: 0.76, energyPerBit: 48.32, throughputKbps100kHz: 15.8, efficiencyKbpsPerKGE: 20.7 },
        software: { keyBits: 96, blockBits: 48, romBytes: 170, ramBytes: 0, latencyCyclesPerBlock: 594, energyPerBit: 2.3, throughputKbps4MHz: 323, efficiencyKbpsPerKB: 1900 },
      },
      variantNote: 'The review reports the 48-bit block / 96-bit key variant, which this project does not implement.',
      observations: [
        'The review highlights SIMON as optimised for hardware, with its most compact version requiring 763 GE.',
        'In the review\'s software comparison SIMON ranks second in software efficiency after SPECK (594 cycles/block, 170 bytes of memory).',
        'It is recommended in the review for home appliances, RFID logistics, smart-agriculture sensors and industrial systems.',
      ],
    },
    securityNotes: [
      'Extensive third-party cryptanalysis (differential, linear, impossible-differential, cube attacks) has broken only reduced-round versions; the review lists these and notes dynamic cube attacks on reduced-round SIMON-32/64.',
      'The designers published limited design rationale initially, and ISO/IEC declined to standardise SIMON and SPECK in 2018. Trust in the design, not a known break, is the main concern raised.',
      'SIMON-32/64 has a 32-bit block: collisions become likely after about 2^16 blocks (256 KiB) under one key, so it is unsuitable for encrypting large amounts of data.',
      'The 64-bit block variants have a birthday bound of about 2^32 blocks (32 GiB) per key.',
    ],
    references: ['beaulieu2013', 'beaulieu2019guide', 'thakor2021'],
  },

  SPECK: {
    fullName: 'SPECK family of lightweight block ciphers',
    designers: 'R. Beaulieu, D. Shors, J. Smith, S. Treatman-Clark, B. Weeks, L. Wingers (U.S. National Security Agency)',
    year: 2013,
    family: 'ARX (modular Addition, Rotation, XOR)',
    reviewCategory: 'ARX',
    standardization:
      'Proposed for ISO/IEC 29192-2 together with SIMON; the proposal was rejected in 2018. Linux briefly included SPECK for storage encryption in 2018 before removing it.',
    summary:
      'The software-oriented sibling of SIMON. Each round is a handful of 32-bit (or 16-bit) additions, rotations and XORs, which map directly onto microcontroller instructions.',
    principle: [
      'The block is split into two n-bit words (x, y). Each round computes x = ((x >>> alpha) + y) XOR k_i and then y = (y <<< beta) XOR x, with alpha = 8 and beta = 3 (alpha = 7, beta = 2 for 16-bit words).',
      'Modular addition provides the non-linearity: carries propagate between bit positions in a way XOR and rotation alone cannot.',
      'The key schedule reuses the round function itself, with the round index playing the role of the round key, so very little extra code is needed.',
    ],
    useCases: [
      'Software on 8-, 16- and 32-bit microcontrollers with tight code-size limits',
      'Battery-powered sensor nodes where CPU cycles translate into energy',
      'Home appliances and industrial controllers (listed in the review\'s application table)',
    ],
    implementationNotes: [
      'Implemented variants: SPECK-32/64, SPECK-64/96 and SPECK-64/128. The 48-, 96- and 128-bit block variants are not implemented.',
      'Byte order follows the NSA SIMON and SPECK Implementation Guide (little-endian words; block bytes are y then x).',
      'All operations use 32-bit (or masked 16-bit) integer arithmetic; there are no table lookups, so the implementation does not depend on secret-indexed memory accesses.',
    ],
    literature: {
      reviewTable3: {
        hardware: { keyBits: 96, blockBits: 48, technologyUm: 0.13, areaGE: 884, powerUW: 0.88, energyPerBit: 73.67, throughputKbps100kHz: 12, efficiencyKbpsPerKGE: 13.57 },
        software: { keyBits: 96, blockBits: 48, romBytes: 134, ramBytes: 0, latencyCyclesPerBlock: 408, energyPerBit: 1.6, throughputKbps4MHz: 470.5, efficiencyKbpsPerKB: 3511.19 },
      },
      variantNote: 'The review reports the 48-bit block / 96-bit key variant, which this project does not implement.',
      observations: [
        'The review finds SPECK the winner of its software-efficiency comparison, with the lowest latency (408 cycles/block) and smallest memory requirement (134 bytes).',
        'It reports 884 GE for the most compact hardware implementation (48-bit block, 96-bit key).',
        'Its general observation: fewer, simpler rounds lead to software efficiency, whereas simple round logic leads to hardware efficiency.',
      ],
    },
    securityNotes: [
      'Published attacks (differential, linear, boomerang, differential fault analysis) reach only reduced-round versions; the review lists attacks on reduced versions and fault attacks.',
      'As with SIMON, the main concern raised during standardisation was the limited public design rationale, which led ISO/IEC to reject it in 2018.',
      'SPECK-32/64 has a 32-bit block: collisions become likely after about 2^16 blocks (256 KiB) under one key.',
      'The 64-bit block variants have a birthday bound of about 2^32 blocks (32 GiB) per key.',
    ],
    references: ['beaulieu2013', 'beaulieu2019guide', 'thakor2021'],
  },

  XTEA: {
    fullName: 'eXtended Tiny Encryption Algorithm',
    designers: 'D. J. Wheeler and R. M. Needham (University of Cambridge Computer Laboratory)',
    year: 1997,
    family: 'Feistel network with shift, XOR and addition (ARX-like round function)',
    reviewCategory: 'Feistel network (FN)',
    standardization: 'Not standardised by NIST or ISO/IEC.',
    summary:
      'A tiny Feistel cipher that fixes weaknesses found in TEA. It needs no S-boxes or tables, so the whole cipher fits in a few lines of code.',
    principle: [
      'The 64-bit block is split into two 32-bit halves. Each Feistel round adds to one half a value mixed from the other half using shifts (<< 4, >> 5), XOR and addition, combined with a running sum of the constant delta = 0x9E3779B9 and one of the four key words.',
      'Unlike TEA, the key word used in each round is selected from the running sum, which removes TEA\'s equivalent-key weakness.',
      'The recommended 64 Feistel rounds (32 cycles) make XTEA slower than ciphers with fewer rounds, but each round is very cheap.',
    ],
    useCases: [
      'Very small microcontrollers where code size matters more than speed',
      'Legacy embedded protocols and firmware loaders that already use it',
      'Teaching Feistel structure and why key scheduling matters (TEA vs XTEA)',
    ],
    implementationNotes: [
      'Byte order is big-endian 32-bit words, matching the Botan and libtomcrypt test vectors.',
      'The 64 values (sum + key word) are precomputed during key setup (256 bytes), so the timed loop contains only the round arithmetic.',
      'No table lookups are used, so timing does not depend on secret-indexed memory accesses.',
    ],
    literature: {
      reviewTable3: {
        hardware: null,
        software: { keyBits: 128, blockBits: 64, romBytes: 504, ramBytes: 0, latencyCyclesPerBlock: 17514, energyPerBit: 70, throughputKbps4MHz: 14.6, efficiencyKbpsPerKB: 28.97 },
      },
      hardwareNote: 'Table 3 of the review gives no hardware row for XTEA; the text cites about 3490 GE (Kaps, 2008).',
      observations: [
        'The review describes XTEA as TEA with a more complex key schedule and 64 rounds, reporting a hardware cost of about 3490 GE.',
        'In the review\'s software data XTEA has high latency (17,514 cycles/block) but small code (504 bytes ROM).',
        'The review lists a related-key rectangle attack on 36 rounds of XTEA.',
      ],
    },
    securityNotes: [
      'Published attacks on XTEA target reduced-round versions or the related-key setting (for example a related-key rectangle attack on 36 of 64 rounds); to the authors\' knowledge no practical single-key attack on full 64-round XTEA has been published.',
      'XTEA has received far less standardisation scrutiny than PRESENT or AES and is not recommended for new designs.',
      'The 64-bit block limits safe use to well under 2^32 blocks (32 GiB) per key.',
      'TEA, XTEA\'s predecessor, has equivalent keys and practical related-key attacks; XXTEA, its successor, has a published chosen-plaintext attack on the full cipher.',
    ],
    references: ['wheeler1997', 'thakor2021'],
  },
});
