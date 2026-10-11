import { REFERENCES } from '../data/references.js';
import { getEnvironmentInfo } from '../utils/environment.js';
import { getSelfTestReport } from '../services/selfTestService.js';

const PAPER_SUMMARY = {
  citation:
    'Thakor, V. A., Razzaque, M. A., & Khandaker, M. R. A. (2021). Lightweight Cryptography Algorithms for Resource-Constrained IoT Devices: A Review, Comparison and Research Opportunities. IEEE Access, 9, 28177-28193. https://doi.org/10.1109/ACCESS.2021.3052867',
  summary: [
    'The review surveys symmetric lightweight cryptography for devices such as RFID tags, sensor nodes and smart cards, which have little memory, computing power, silicon area and energy.',
    'It groups more than fifty lightweight block ciphers by structure (SPN, Feistel, generalised Feistel, ARX, NLFSR and hybrid) and compares them using hardware metrics (gate equivalents, power, energy, throughput at 100 kHz) and software metrics (ROM, RAM, cycles per block, throughput at 4 MHz), compiled from earlier studies.',
    'In its software comparison SPECK is the most efficient, followed by SIMON; in hardware, ciphers such as PRESENT, Midori and Piccolo stand out. The authors observe that simple rounds favour hardware efficiency, while fewer and simpler rounds favour software efficiency.',
    'It summarises published attacks for each cipher, noting that many lightweight ciphers have related-key or reduced-round attacks, and maps IoT applications to suitable algorithms.',
    'It concludes that no design optimises cost, performance and security at once, and identifies open problems: lighter S-boxes with good confusion, lighter yet strong key schedules, and reducing rounds without losing security.',
  ],
  distinction:
    'The paper\'s figures come from hardware synthesis and microcontroller studies collected from the literature. This application measures only the software performance of its own JavaScript implementations on your computer. The two kinds of results must not be mixed or directly compared.',
};

export function getHealth(req, res) {
  const report = getSelfTestReport();
  res.json({
    success: true,
    status: 'ok',
    service: 'lightweight-crypto-analyzer-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    nodeVersion: process.version,
    selfTestCheckedAt: report.checkedAt,
  });
}

export function getEnvironment(req, res) {
  res.json({ success: true, environment: getEnvironmentInfo() });
}

export function getReferences(req, res) {
  res.json({ success: true, references: REFERENCES, paper: PAPER_SUMMARY });
}

export function getSelfTest(req, res) {
  res.json({ success: true, ...getSelfTestReport() });
}
