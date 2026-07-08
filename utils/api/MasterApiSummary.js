const fs = require('fs');
const path = require('path');

const envs = ['east', 'west', 'shopx'];

const testResultsDir = path.join(process.cwd(), 'test-results');

let grandTotal = 0;
let grandPassed = 0;
let grandFailed = 0;

console.log(`
=====================================================================
                  PEP BOYS MASTER API EXECUTION SUMMARY
=====================================================================
`);

for (const env of envs) {
  const summaryFile = path.join(testResultsDir, `api-summary-${env}.json`);

  if (!fs.existsSync(summaryFile)) {
    console.log(`Environment : ${env.toUpperCase()}`);
    console.log(`Status      : Summary file not found`);
    console.log(`---------------------------------------------------------------------`);
    continue;
  }

  const results = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));

  const passed = results.filter((r) => r.result === 'PASSED');
  const failed = results.filter((r) => r.result === 'FAILED');

  grandTotal += results.length;
  grandPassed += passed.length;
  grandFailed += failed.length;

  console.log(`Environment : ${env.toUpperCase()}`);
  console.log(`Total APIs   : ${results.length}`);
  console.log(`Passed       : ${passed.length}`);
  console.log(`Failed       : ${failed.length}`);

  if (failed.length > 0) {
    console.log(`Failed APIs:`);

    for (const fail of failed) {
      console.log(`- Test ${fail.testNo} | ${fail.folder} > ${fail.api} | Status: ${fail.status}`);
    }
  }

  console.log(`---------------------------------------------------------------------`);
}

console.log(`
Overall Total APIs : ${grandTotal}
Overall Passed     : ${grandPassed}
Overall Failed     : ${grandFailed}
Execution Time     : ${new Date().toLocaleString()}

=====================================================================
`);