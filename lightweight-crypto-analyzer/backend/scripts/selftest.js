// Prints the known-answer self-test report: `npm run selftest`
import { runSelfTests } from '../src/services/selfTestService.js';

const report = runSelfTests();
let failures = 0;
for (const [id, result] of Object.entries(report.algorithms)) {
  console.log(`\n${id}`);
  for (const vector of result.vectors) {
    if (!vector.passed) failures++;
    console.log(
      `  ${vector.passed ? 'PASS' : 'FAIL'}  variant ${vector.variant.padEnd(6)} key ${vector.key} pt ${vector.plaintext} -> ${vector.actualCiphertext ?? '-'} (expected ${vector.expectedCiphertext ?? '-'})`,
    );
  }
  for (const [variant, status] of Object.entries(result.variants)) {
    console.log(`  variant ${variant}: ${status.vectorsPassed}/${status.vectorsTotal} vectors, ${status.roundTripsPassed}/${status.roundTripsTotal} mode round trips -> ${status.verified ? 'VERIFIED' : 'NOT VERIFIED'}`);
  }
}
console.log(failures === 0 ? '\nAll known-answer vectors passed.' : `\n${failures} known-answer vector(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
