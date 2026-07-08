import { test, expect } from '@playwright/test';
import { loadPostmanSteps } from '../../../utils/api/PostmanCollectionReader';
import { loadRuntime } from '../../../utils/api/RuntimeManager';
import { runPostmanStep } from '../../../utils/api/PostmanRunner';
import * as fs from 'fs';
import * as path from 'path';

const steps = loadPostmanSteps();

expect(steps.length, 'Postman collection should contain 60 API requests').toBe(60);

test.describe.configure({ mode: 'default' });

test.beforeEach(() => {
  loadRuntime();
});

steps.forEach((step, index) => {
  const title = `${String(index + 1).padStart(2, '0')} - ${[
    ...step.folderPath,
    step.name,
  ]
    .filter(Boolean)
    .join(' > ')}`;

  test(title, async ({ request, browser }) => {
    await runPostmanStep(
      index,
      steps,
      request,
      index === 0 ? browser : undefined
    );
  });
});

test.afterAll(async () => {
  const apiRegion = (process.env.API_ENV || 'east').toUpperCase();

  const summaryFile = path.join(
    process.cwd(),
    'test-results',
    `api-summary-${apiRegion.toLowerCase()}.json`
  );

  if (!fs.existsSync(summaryFile)) {
    console.log('No API summary file found.');
    return;
  }

  const results = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));

  const passed = results.filter((r: any) => r.result === 'PASSED');
  const failed = results.filter((r: any) => r.result === 'FAILED');

  console.log(`
=====================================================================
                    PEP BOYS API EXECUTION SUMMARY
=====================================================================

Environment : QA ${apiRegion}
Total APIs   : ${results.length}
Passed       : ${passed.length}
Failed       : ${failed.length}
Execution   : ${new Date().toLocaleString()}

=====================================================================
`);

  if (failed.length > 0) {
    console.log('FAILED APIs:');

    for (const fail of failed) {
      console.log(`
❌ Test ${fail.testNo} - ${fail.folder} > ${fail.api}
Status : ${fail.status}
URL    : ${fail.url}
`);
    }

    console.log('=====================================================================');
  }
});