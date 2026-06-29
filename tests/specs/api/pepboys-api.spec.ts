import { test, expect, Page, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Complete Pepboys API Hybrid Flow
 *
 * Flow:
 * 01 Browser opens OAuth/OneLogin URL
 * 02 Fresh code is captured from redirect URL
 * 03 Auth Token API body code is replaced with fresh code
 * 04 refreshToken/authToken/geoToken/workOrderId are passed to next APIs
 * 05 All 60 APIs run in the same Postman collection order
 *
 * Run East:
 * $env:API_ENV="east"
 * npx playwright test tests/specs/api/pepboys-api-flow.spec.ts --headed --workers=1
 *
 * Run West:
 * $env:API_ENV="west"
 * npx playwright test tests/specs/api/pepboys-api-flow.spec.ts --headed --workers=1
 */

type RuntimeVariables = {
  authCode?: string;
  refreshToken?: string;
  authToken?: string;
  geoToken?: string;
  workOrderId?: string;
};

type PostmanStep = {
  name: string;
  folderPath: string[];
  method: string;
  rawUrl: string;
  headers: Record<string, string>;
  rawBody?: string;
  auth?: any;
};

const runtime: RuntimeVariables = {};

const runtimeFile = path.join(
  process.cwd(),
  'test-results',
  `runtime-vars-${(process.env.API_ENV || 'east').toLowerCase()}.json`
);

function maskRuntimeForLog(value?: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= 12) {
    return '********';
  }

  return `${value.substring(0, 6)}...${value.substring(value.length - 6)}`;
}

function saveRuntime(): void {
  fs.mkdirSync(path.dirname(runtimeFile), { recursive: true });

  fs.writeFileSync(
    runtimeFile,
    JSON.stringify(runtime, null, 2)
  );

  console.log(`Runtime saved: ${runtimeFile}`);
  console.log({
    authCode: maskRuntimeForLog(runtime.authCode),
    refreshToken: maskRuntimeForLog(runtime.refreshToken),
    authToken: maskRuntimeForLog(runtime.authToken),
    geoToken: maskRuntimeForLog(runtime.geoToken),
    workOrderId: runtime.workOrderId || '',
  });
}

function loadRuntime(): void {
  if (!fs.existsSync(runtimeFile)) {
    return;
  }

  Object.assign(
    runtime,
    JSON.parse(fs.readFileSync(runtimeFile, 'utf8'))
  );
}

function clearRuntime(): void {
  if (fs.existsSync(runtimeFile)) {
    fs.unlinkSync(runtimeFile);
  }

  runtime.authCode = undefined;
  runtime.refreshToken = undefined;
  runtime.authToken = undefined;
  runtime.geoToken = undefined;
  runtime.workOrderId = undefined;

  console.log(`Runtime cleared: ${runtimeFile}`);
}

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env value: ${name}`);
  }

  return value;
}

function getApiBaseUrl(): string {
  const apiEnv = (process.env.API_ENV || 'east').toLowerCase();

  const value =
    apiEnv === 'west'
      ? process.env.API_QA_WEST
      : process.env.API_QA_EAST;

  if (!value) {
    throw new Error(
      apiEnv === 'west'
        ? 'Missing API_QA_WEST in .env'
        : 'Missing API_QA_EAST in .env'
    );
  }

  return value.endsWith('/') ? value : `${value}/`;
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateCodeChallenge(codeVerifier: string): string {
  return base64Url(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );
}

function buildOAuthUrl(): string {
  const codeVerifier = process.env.OAUTH_CODE_VERIFIER || process.env.API_CODE_VERIFIER;

  if (!codeVerifier) {
    throw new Error('Missing OAUTH_CODE_VERIFIER or API_CODE_VERIFIER in .env');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: required('OAUTH_CLIENT_ID'),
    redirect_uri: required('OAUTH_REDIRECT_URI'),
    scope: process.env.OAUTH_SCOPE || 'openid profile email params',
    state: process.env.OAUTH_STATE || 'abc123',
    code_challenge: generateCodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
  });

  return `${required('OAUTH_AUTH_URL')}?${params.toString()}`;
}

function extractCodeFromUrl(url: string): string | null {
  const parsedUrl = new URL(url);

  return (
    parsedUrl.searchParams.get('code') ||
    new URLSearchParams(parsedUrl.hash.replace(/^#/, '')).get('code')
  );
}

async function loginIfRequired(page: Page): Promise<void> {
  const usernameInput = page
    .locator(
      'input[name="username"], input[type="email"], input[placeholder*="Username"], input[placeholder*="Email"], input[id*="username"], input[id*="email"]'
    )
    .first();

  const isUsernameVisible = await usernameInput
    .isVisible({ timeout: 10_000 })
    .catch(() => false);

  if (!isUsernameVisible) {
    return;
  }

  await usernameInput.fill(required('APP_USER'));

  const continueButton = page
    .getByRole('button', { name: /continue|next/i })
    .first();

  if (await continueButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await continueButton.click();
  }

  const passwordInput = page
    .locator('input[name="password"], input[type="password"], input[id*="password"]')
    .first();

  await passwordInput.waitFor({ state: 'visible', timeout: 30_000 });
  await passwordInput.fill(required('APP_PASS'));

  await page
    .getByRole('button', { name: /log in|login|sign in|continue/i })
    .first()
    .click();
}

async function getFreshAuthCode(page: Page): Promise<string> {
  const oauthUrl = buildOAuthUrl();

  await page.goto(oauthUrl, { waitUntil: 'domcontentloaded' });

  const codeFromInitialUrl = extractCodeFromUrl(page.url());

  if (codeFromInitialUrl) {
    return codeFromInitialUrl;
  }

  await loginIfRequired(page);

  await page.waitForURL(
    url => Boolean(extractCodeFromUrl(url.toString())),
    { timeout: 120_000 }
  );

  const code = extractCodeFromUrl(page.url());

  if (!code) {
    throw new Error(`Auth code not found in redirect URL: ${page.url()}`);
  }

  console.log(`Fresh auth code captured: ${code.substring(0, 8)}...`);

  return code;
}

function decodeJwtPayload(token: string): any {
  const payload = token.split('.')[1];

  if (!payload) {
    throw new Error('Invalid JWT token. Payload part not found.');
  }

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');

  return JSON.parse(decoded);
}

function readCollection(): any {
  const collectionPath = path.resolve(
    process.cwd(),
    'test-data/api/collections/Pepboys_AllEndpoints.postman_collection.json'
  );

  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Collection file not found: ${collectionPath}`);
  }

  return JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));
}

function flattenCollectionItems(items: any[], folderPath: string[] = [], output: PostmanStep[] = []): PostmanStep[] {
  for (const item of items) {
    if (item.item) {
      flattenCollectionItems(item.item, [...folderPath, item.name], output);
      continue;
    }

    const request = item.request;
    const headers: Record<string, string> = {};

    for (const header of request.header || []) {
      if (header.disabled) {
        continue;
      }

      if (!header.key) {
        continue;
      }

      headers[header.key] = header.value ?? '';
    }

    output.push({
      name: item.name,
      folderPath,
      method: request.method,
      rawUrl: request.url?.raw,
      headers,
      rawBody: request.body?.raw,
      auth: request.auth,
    });
  }

  return output;
}

const collection = readCollection();
const steps = flattenCollectionItems(collection.item);

expect(steps.length, 'Postman collection should contain 60 API requests').toBe(61);

function replaceRuntimeVariables(value: string): string {
  const apiBaseUrl = getApiBaseUrl();

  return value
    .replace(/{{QA}}\//g, apiBaseUrl)
    .replace(/{{QA}}/g, apiBaseUrl)
    .replace(/{{authCode}}/g, runtime.authCode || '')
    .replace(/{{refreshToken}}/g, runtime.refreshToken || '')
    .replace(/{{authToken}}/g, runtime.authToken || '')
    .replace(/{{geoToken}}/g, runtime.geoToken || '')
    .replace(/{{workOrderId}}/g, runtime.workOrderId || '');
}

function buildUrl(step: PostmanStep): string {
  if (!step.rawUrl) {
    throw new Error(`URL not found for step: ${step.name}`);
  }

  return replaceRuntimeVariables(step.rawUrl);
}

function buildBody(step: PostmanStep): any {
  if (!step.rawBody) {
    return undefined;
  }

  const resolvedBody = replaceRuntimeVariables(step.rawBody);

  try {
    const body = JSON.parse(resolvedBody);

    if (step.name === 'Auth Token') {
      body.code = runtime.authCode;
      body.codeVerifier =
        process.env.OAUTH_CODE_VERIFIER ||
        process.env.API_CODE_VERIFIER ||
        body.codeVerifier;
    }

    return body;
  } catch {
    return resolvedBody;
  }
}

function buildHeaders(step: PostmanStep): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(step.headers || {})) {
    const lowerKey = key.toLowerCase();

    // Ignore stale captured browser headers from Postman collection.
    if (
      [
        'authorization',
        'origin',
        'referer',
        'user-agent',
        'sec-ch-ua',
        'sec-ch-ua-mobile',
        'sec-ch-ua-platform',
        'sec-fetch-dest',
        'sec-fetch-mode',
        'sec-fetch-site',
        'priority',
        'accept-language',
      ].includes(lowerKey)
    ) {
      continue;
    }

    headers[key] = replaceRuntimeVariables(value);
  }

  headers.accept = headers.accept || 'application/json, text/plain, */*';
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  headers['X-Authenticated-User'] =
    headers['X-Authenticated-User'] ||
    headers['x-authenticated-user'] ||
    'DummyValue123';
  headers['X-Device-ID'] =
    headers['X-Device-ID'] ||
    headers['x-device-id'] ||
    'DummyValue123';

  if (step.name !== 'Auth Token' && step.name !== 'Refresh Token' && runtime.authToken) {
    headers.Authorization = `Bearer ${runtime.authToken}`;
  }

  if (runtime.geoToken) {
    headers['X-Geo-Token'] = runtime.geoToken;
  }

  return headers;
}

async function updateRuntimeVariables(step: PostmanStep, responseText: string): Promise<void> {
  if (!responseText) {
    return;
  }

  let jsonData: any;

  try {
    jsonData = JSON.parse(responseText);
  } catch {
    return;
  }

  if (step.name === 'Auth Token') {
    const bootstrapToken = jsonData?.data?.bootstrapToken;

    expect(bootstrapToken, 'bootstrapToken should exist in Auth Token response').toBeTruthy();

    const jwtPayload = decodeJwtPayload(bootstrapToken);

    runtime.refreshToken =
      jwtPayload.refreshToken ||
      jwtPayload.refresh_token ||
      jwtPayload.rt;

    expect(runtime.refreshToken, 'refreshToken should exist inside bootstrapToken').toBeTruthy();

    saveRuntime();

    console.log('Refresh token generated successfully');
    return;
  }

  if (step.name === 'Refresh Token') {
    runtime.authToken =
      jsonData?.data?.accessToken ||
      jsonData?.accessToken ||
      jsonData?.token;

    expect(runtime.authToken, 'authToken should exist in Refresh Token response').toBeTruthy();

    saveRuntime();

    console.log('Auth token generated successfully');
    return;
  }

  if (step.name === 'GEO Token Refresh') {
    runtime.geoToken =
      jsonData?.data?.geoToken ||
      jsonData?.geoToken ||
      jsonData?.token;

    expect(runtime.geoToken, 'geoToken should exist in GEO Token response').toBeTruthy();

    saveRuntime();

    console.log('Geo token generated successfully');
    return;
  }

  if (step.name === 'New Work Order') {
    runtime.workOrderId =
      jsonData?.data?.swoId ||
      jsonData?.data?.workOrderId ||
      jsonData?.workOrderId ||
      jsonData?.id;

    expect(runtime.workOrderId, 'workOrderId should exist in New Work Order response').toBeTruthy();

    saveRuntime();

    console.log(`Work Order ID: ${runtime.workOrderId}`);
  }
}

function expectedStatusesFor(step: PostmanStep): number[] {
  if (step.method === 'POST') {
    return [200, 201, 204];
  }

  if (step.method === 'PUT' || step.method === 'PATCH') {
    return [200, 201, 204];
  }

  if (step.method === 'DELETE') {
    return [200, 202, 204];
  }

  return [200];
}

async function runPostmanStep(index: number, request: APIRequestContext, page: Page): Promise<void> {
  loadRuntime();

  if (index === 0) {
    clearRuntime();
  }

  const step = steps[index];

  if (!step) {
    throw new Error(`Step not found at index: ${index}`);
  }

  if (step.name === 'Auth Token') {
    runtime.authCode = await getFreshAuthCode(page);
    saveRuntime();
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

  expect(
    expectedStatusesFor(step),
    `${step.name} should return expected status. Response: ${responseText.substring(0, 700)}`
  ).toContain(status);

  await updateRuntimeVariables(step, responseText);
}

// Keep default mode. With fullyParallel=false and one spec file, tests run in file order.
// Do not use serial mode, because serial mode skips remaining tests after one failure.
test.describe.configure({ mode: 'default' });

test.beforeEach(async () => {
  loadRuntime();
});

test(`01 - Token APIs > Auth Token`, async ({ request, page }) => {
  await runPostmanStep(0, request, page);
});

test(`02 - Token APIs > Refresh Token`, async ({ request, page }) => {
  await runPostmanStep(1, request, page);
});

test(`03 - Token APIs > GEO Token Refresh`, async ({ request, page }) => {
  await runPostmanStep(2, request, page);
});

test(`04 - Home Page > Summary`, async ({ request, page }) => {
  await runPostmanStep(3, request, page);
});

test.skip(`05 - Home Page > Work Order List_Shop Activity`, async ({ request, page }) => {
  await runPostmanStep(4, request, page);
});

test(`06 - Click on WorkOrder > New Work Order`, async ({ request, page }) => {
  await runPostmanStep(5, request, page);
});

test(`07 - Customer > Add customer to DB`, async ({ request, page }) => {
  await runPostmanStep(6, request, page);
});

test(`08 - Customer > Search Customer by firstname & lastname`, async ({ request, page }) => {
  await runPostmanStep(7, request, page);
});

test(`09 - Customer > Search Customer by email`, async ({ request, page }) => {
  await runPostmanStep(8, request, page);
});

test(`10 - Customer > Search Customer by phone number`, async ({ request, page }) => {
  await runPostmanStep(9, request, page);
});

test(`11 - Customer > Customer Info`, async ({ request, page }) => {
  await runPostmanStep(10, request, page);
});

test(`12 - Vehicles > Identify Vehicle`, async ({ request, page }) => {
  await runPostmanStep(11, request, page);
});

test(`13 - Vehicles > Vehicle Models`, async ({ request, page }) => {
  await runPostmanStep(12, request, page);
});

test(`14 - Vehicles > Vehicle Engines`, async ({ request, page }) => {
  await runPostmanStep(13, request, page);
});

test(`15 - Vehicles > Vehicle Makes`, async ({ request, page }) => {
  await runPostmanStep(14, request, page);
});

test(`16 - Vehicles > Add Vehicles`, async ({ request, page }) => {
  await runPostmanStep(15, request, page);
});

test(`17 - Vehicles > Vehicle_Customer Update`, async ({ request, page }) => {
  await runPostmanStep(16, request, page);
});

test(`18 - Vehicles > Vehicle_Customer with Workorder id`, async ({ request, page }) => {
  await runPostmanStep(17, request, page);
});

test(`19 - Recommended Services > Last Reported Service`, async ({ request, page }) => {
  await runPostmanStep(18, request, page);
});

test(`20 - Recommended Services > Open Recall Requests`, async ({ request, page }) => {
  await runPostmanStep(19, request, page);
});

test(`21 - Services > Navigates to Services Page`, async ({ request, page }) => {
  await runPostmanStep(20, request, page);
});

test(`22 - List of Services > Selection Service`, async ({ request, page }) => {
  await runPostmanStep(21, request, page);
});

test(`23 - List of Services > Selection_Item`, async ({ request, page }) => {
  await runPostmanStep(22, request, page);
});

test(`24 - List of Services > Selection Item 2`, async ({ request, page }) => {
  await runPostmanStep(23, request, page);
});

test(`25 - SWO Flow > Line Items`, async ({ request, page }) => {
  await runPostmanStep(24, request, page);
});

test(`26 - SWO Flow > Workorder Details`, async ({ request, page }) => {
  await runPostmanStep(25, request, page);
});

test(`27 - SWO Flow > Workorder : Customer Deatils`, async ({ request, page }) => {
  await runPostmanStep(26, request, page);
});

test(`28 - Technician > Workorder : lines`, async ({ request, page }) => {
  await runPostmanStep(27, request, page);
});

test(`29 - Technician > Workload`, async ({ request, page }) => {
  await runPostmanStep(28, request, page);
});

test(`30 - Technician > Assign Technician`, async ({ request, page }) => {
  await runPostmanStep(29, request, page);
});

test(`31 - Technician > Workorder : Line Items`, async ({ request, page }) => {
  await runPostmanStep(30, request, page);
});

test(`32 - Vehicle Info > Vehicle Colors`, async ({ request, page }) => {
  await runPostmanStep(31, request, page);
});

test(`33 - Vehicle Info > Vehicle Details`, async ({ request, page }) => {
  await runPostmanStep(32, request, page);
});

test(`34 - Vehicle Info > Vehicle Update`, async ({ request, page }) => {
  await runPostmanStep(33, request, page);
});

test(`35 - Time Promosied and Contact Methods > Promise Contact`, async ({ request, page }) => {
  await runPostmanStep(34, request, page);
});

test(`36 - Time Promosied and Contact Methods > Promised Contact : Updates`, async ({ request, page }) => {
  await runPostmanStep(35, request, page);
});

test(`37 - Time Promosied and Contact Methods > Line Items`, async ({ request, page }) => {
  await runPostmanStep(36, request, page);
});

test(`38 - Time Promosied and Contact Methods > ByPass Signature`, async ({ request, page }) => {
  await runPostmanStep(37, request, page);
});

test(`39 - Search Workorders > Line Items`, async ({ request, page }) => {
  await runPostmanStep(38, request, page);
});

test(`40 - Search Workorders > Workorder details`, async ({ request, page }) => {
  await runPostmanStep(39, request, page);
});

test(`41 - Search Workorders > Workorder deatuls By CustomerId`, async ({ request, page }) => {
  await runPostmanStep(40, request, page);
});

test(`42 - Authorize Workorders > Authorize Workorder List`, async ({ request, page }) => {
  await runPostmanStep(41, request, page);
});

test(`43 - Authorize Workorders > Authorization Approval`, async ({ request, page }) => {
  await runPostmanStep(42, request, page);
});

test(`44 - Authorize Workorders > Line Items_Post Authorization`, async ({ request, page }) => {
  await runPostmanStep(43, request, page);
});

test(`45 - Authorize Workorders > Workorder details_Post Authorization`, async ({ request, page }) => {
  await runPostmanStep(44, request, page);
});

test(`46 - Authorize Workorders > Workorder deatuls By CustomerId_Post Authorization`, async ({ request, page }) => {
  await runPostmanStep(45, request, page);
});

test(`47 - Service Complete > Vehicle Details`, async ({ request, page }) => {
  await runPostmanStep(46, request, page);
});

test(`48 - Service Complete > Vehicle Colors`, async ({ request, page }) => {
  await runPostmanStep(47, request, page);
});

test(`49 - Service Complete > Vehicle Milage Out`, async ({ request, page }) => {
  await runPostmanStep(48, request, page);
});

test(`50 - Service Complete > Checklist`, async ({ request, page }) => {
  await runPostmanStep(49, request, page);
});

test(`51 - Service Complete > Answers`, async ({ request, page }) => {
  await runPostmanStep(50, request, page);
});

test(`52 - Service Complete > Promise Contact`, async ({ request, page }) => {
  await runPostmanStep(51, request, page);
});

test(`53 - Service Complete > Service Complete`, async ({ request, page }) => {
  await runPostmanStep(52, request, page);
});

test(`54 - Ready for Pickup > Line Items`, async ({ request, page }) => {
  await runPostmanStep(53, request, page);
});

test(`55 - Ready for Pickup > Workorder Details`, async ({ request, page }) => {
  await runPostmanStep(54, request, page);
});

test(`56 - Ready for Pickup > Workorder deatuls By CustomerId_Post Service Complete`, async ({ request, page }) => {
  await runPostmanStep(55, request, page);
});

test(`57 - Ready for Pickup > Vehicle Details`, async ({ request, page }) => {
  await runPostmanStep(56, request, page);
});

test(`58 - Ready for Pickup > Vehicle Colors`, async ({ request, page }) => {
  await runPostmanStep(57, request, page);
});

test(`59 - Ready for Pickup > Promise Contact`, async ({ request, page }) => {
  await runPostmanStep(58, request, page);
});

test(`60 - Ready for Pickup > Ready for Pickup`, async ({ request, page }) => {
  await runPostmanStep(59, request, page);
});
