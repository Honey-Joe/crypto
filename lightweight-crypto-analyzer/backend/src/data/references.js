/**
 * Bibliography used by the API and the About / Algorithm Information pages.
 * `primary: true` marks the reference paper this project is based on.
 */
export const REFERENCES = Object.freeze([
  {
    id: 'thakor2021',
    primary: true,
    authors: 'V. A. Thakor, M. A. Razzaque and M. R. A. Khandaker',
    title: 'Lightweight Cryptography Algorithms for Resource-Constrained IoT Devices: A Review, Comparison and Research Opportunities',
    venue: 'IEEE Access, vol. 9, pp. 28177-28193',
    year: 2021,
    doi: '10.1109/ACCESS.2021.3052867',
    url: 'https://doi.org/10.1109/ACCESS.2021.3052867',
    note: 'Reference paper for this project. An earlier version by the same authors is available as arXiv:2006.13813.',
  },
  {
    id: 'thakor2020preprint',
    authors: 'V. A. Thakor, M. A. Razzaque and M. R. A. Khandaker',
    title: 'Lightweight Cryptography for IoT: A State-of-the-Art',
    venue: 'arXiv preprint arXiv:2006.13813',
    year: 2020,
    url: 'https://arxiv.org/abs/2006.13813',
    note: 'Preprint of the reference paper; the literature figures shown in this application were transcribed from its Table 3.',
  },
  {
    id: 'bogdanov2007',
    authors: 'A. Bogdanov, L. R. Knudsen, G. Leander, C. Paar, A. Poschmann, M. J. B. Robshaw, Y. Seurin and C. Vikkelsoe',
    title: 'PRESENT: An Ultra-Lightweight Block Cipher',
    venue: 'Cryptographic Hardware and Embedded Systems (CHES 2007), LNCS 4727, Springer, pp. 450-466',
    year: 2007,
    doi: '10.1007/978-3-540-74735-2_31',
    url: 'https://doi.org/10.1007/978-3-540-74735-2_31',
    note: 'Specification and PRESENT-80 test vectors (Appendix I).',
  },
  {
    id: 'beaulieu2013',
    authors: 'R. Beaulieu, D. Shors, J. Smith, S. Treatman-Clark, B. Weeks and L. Wingers',
    title: 'The SIMON and SPECK Families of Lightweight Block Ciphers',
    venue: 'IACR Cryptology ePrint Archive, Report 2013/404',
    year: 2013,
    url: 'https://eprint.iacr.org/2013/404',
    note: 'Specification and test vectors for SIMON and SPECK.',
  },
  {
    id: 'beaulieu2019guide',
    authors: 'U.S. National Security Agency',
    title: 'SIMON and SPECK Implementation Guide',
    venue: 'NSA Cybersecurity (github.com/nsacyber/simon-speck)',
    year: 2019,
    url: 'https://github.com/nsacyber/simon-speck',
    note: 'Defines the little-endian byte order used for SIMON and SPECK in this project.',
  },
  {
    id: 'wheeler1997',
    authors: 'D. J. Wheeler and R. M. Needham',
    title: 'Tea extensions',
    venue: 'Technical report, Computer Laboratory, University of Cambridge',
    year: 1997,
    note: 'Defines XTEA.',
  },
  {
    id: 'nist80038a',
    authors: 'M. Dworkin (NIST)',
    title: 'Recommendation for Block Cipher Modes of Operation: Methods and Techniques',
    venue: 'NIST Special Publication 800-38A',
    year: 2001,
    doi: '10.6028/NIST.SP.800-38A',
    url: 'https://doi.org/10.6028/NIST.SP.800-38A',
    note: 'Defines the ECB, CBC and CTR modes used by this project.',
  },
  {
    id: 'rfc5652',
    authors: 'R. Housley',
    title: 'Cryptographic Message Syntax (CMS), section 6.3 (PKCS#7 padding)',
    venue: 'IETF RFC 5652',
    year: 2009,
    url: 'https://www.rfc-editor.org/rfc/rfc5652',
    note: 'Defines the padding scheme used with CBC and ECB.',
  },
  {
    id: 'nistsp800232',
    authors: 'NIST',
    title: 'Ascon-Based Lightweight Cryptography Standards for Constrained Devices',
    venue: 'NIST Special Publication 800-232',
    year: 2025,
    url: 'https://csrc.nist.gov/pubs/sp/800/232/final',
    note: 'Outcome of the NIST lightweight cryptography standardisation process (Ascon, an authenticated cipher). Mentioned as a future enhancement.',
  },
]);

export function findReference(id) {
  return REFERENCES.find((reference) => reference.id === id);
}
