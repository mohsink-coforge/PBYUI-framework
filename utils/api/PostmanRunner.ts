import { APIRequestContext, Browser } from '@playwright/test';
import { runtime, loadRuntime, clearRuntime, saveRuntime } from './RuntimeManager';
import { PostmanStep } from './types';
import { getFreshAuthCode } from './OAuthService';
import { buildUrl, buildHeaders, buildBody } from './RequestBuilder';
import { validateResponse, updateRuntimeVariables } from './ResponseValidator';

export async function runPostmanStep(
  index: number,
  steps: PostmanStep[],
  request: APIRequestContext,
  browser?: Browser
): Promise<void> {
  loadRuntime();

  if (index === 0) {
    clearRuntime();
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

  console.log(`\n[${index + 1}/${steps.length}] ${step.method} ${step.name}`);
  console.log(`URL: ${url}`);

  const response = await request.fetch(url, {
    method: step.method,
    headers,
    data,
    timeout: 60_000,
    ignoreHTTPSErrors: true,
  });

  const status = response.status();
  const responseText = await response.text();

  console.log(`${step.name} Status: ${status}`);
  console.log(`${step.name} Response: ${responseText.substring(0, 700)}`);

  validateResponse(step, status, responseText, url);
  await updateRuntimeVariables(step, responseText);
}