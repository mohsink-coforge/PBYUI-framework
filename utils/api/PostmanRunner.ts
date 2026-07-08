import { APIRequestContext, Browser } from '@playwright/test';
import { runtime, loadRuntime, clearRuntime, saveRuntime } from './RuntimeManager';
import { PostmanStep } from './types';
import { getFreshAuthCode } from './OAuthService';
import { buildUrl, buildHeaders, buildBody } from './RequestBuilder';
import { validateResponse, updateRuntimeVariables } from './ResponseValidator';
import * as fs from 'fs';
import * as path from 'path';

const apiRegion = (process.env.API_ENV || 'east').toUpperCase();

const summaryFile = path.join(
  process.cwd(),
  'test-results',
  `api-summary-${apiRegion.toLowerCase()}.json`
);

function clearSummary() {
  fs.mkdirSync(path.dirname(summaryFile), { recursive: true });
  fs.writeFileSync(summaryFile, JSON.stringify([], null, 2));
}

function saveApiResult(result: any) {
  fs.mkdirSync(path.dirname(summaryFile), { recursive: true });

  const existing = fs.existsSync(summaryFile)
    ? JSON.parse(fs.readFileSync(summaryFile, 'utf8'))
    : [];

  existing.push(result);

  fs.writeFileSync(summaryFile, JSON.stringify(existing, null, 2));
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Index starts from 0.
// Test 24 = index 23
// Test 46 = index 45
const customWaits: Record<number, number> = {
  23: 10000,
  27: 10000,
  42: 15000,
};

const DEFAULT_WAIT = 1000;

export async function runPostmanStep(
  index: number,
  steps: PostmanStep[],
  request: APIRequestContext,
  browser?: Browser
): Promise<void> {
  loadRuntime();

  if (index === 0) {
     clearRuntime();
  clearSummary();
  }

  const step = steps[index];

  if (!step) {
    throw new Error(`Step not found at index: ${index}`);
  }

  if (step.name === 'Auth Token') {
    if (!browser) {
      throw new Error('Browser is required only for Auth Token step');
    }

    const page = await browser.newPage();

    try {
      runtime.authCode = await getFreshAuthCode(page);
      saveRuntime();
    } finally {
      await page.close();
    }
  }

  const url = buildUrl(step);
  const headers = buildHeaders(step);
  const data = buildBody(step);

  console.log(`\n====================================================`);
  console.log(`[${index + 1}/${steps.length}] ${step.method} ${step.name}`);
  console.log(`URL: ${url}`);

  if (index > 0) {
    const waitTime = customWaits[index] ?? DEFAULT_WAIT;

    console.log(
      `Waiting ${waitTime / 1000} seconds before Test ${index + 1} - ${step.name}...`
    );

    await wait(waitTime);
  }

  const response = await request.fetch(url, {
    method: step.method,
    headers,
    data,
    timeout: 60_000,
    ignoreHTTPSErrors: true,
  });

  const status = response.status();
  const responseText = await response.text();

  console.log(`Status   : ${status}`);
  console.log(`Response : ${responseText.substring(0, 700)}`);

  const startedAt = Date.now();

try {
  validateResponse(step, status, responseText, url);

  saveApiResult({
    testNo: index + 1,
    api: step.name,
    folder: step.folderPath?.join(' > ') || '',
    method: step.method,
    url,
    status,
    result: 'PASSED',
    environment: `QA ${apiRegion}`,
    timestamp: new Date().toISOString(),
  });

  await updateRuntimeVariables(step, responseText);
} catch (error: any) {
  saveApiResult({
    testNo: index + 1,
    api: step.name,
    folder: step.folderPath?.join(' > ') || '',
    method: step.method,
    url,
    status,
    result: 'FAILED',
    error: error.message,
    response: responseText.substring(0, 1000),
    environment: `QA ${apiRegion}`,
    timestamp: new Date().toISOString(),
  });

  throw error;
}

 
}