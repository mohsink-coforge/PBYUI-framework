import { test, expect } from '@playwright/test';
import { getFreshAuthCode } from '../../../utils/api/oauthAuthCode';

test.describe.configure({ mode: 'default' });

let refreshToken = '';
let authToken = '';
let geoToken = '';
let workOrderId = '';

function getApiBaseUrl(): string {
  const env = process.env.API_ENV || 'east';

  if (env.toLowerCase() === 'west') {
    return process.env.API_QA_WEST!;
  }

  return process.env.API_QA_EAST!;
}

function decodeJwtPayload(token: string): any {
  const payload = token.split('.')[1];

  const decoded = Buffer
    .from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    .toString('utf-8');

  return JSON.parse(decoded);
}

test('01 - Get fresh auth code from UI and generate Auth Token', async ({ page, request }) => {
  const apiBaseUrl = getApiBaseUrl();

  const freshCode = await getFreshAuthCode(page);

  const response = await request.post(`${apiBaseUrl}admin/api/v1/auth/token`, {
    headers: {
      'X-Authenticated-User': 'abc',
      'X-Device-ID': 'abc',
      'Content-Type': 'application/json',
    },
    data: {
      code: freshCode,
      codeVerifier: process.env.OAUTH_CODE_VERIFIER,
      latitude: 40.250001,
      longitude: -75.250001,
    },
  });

  expect(response.status()).toBe(200);

  const body = await response.json();

  const bootstrapToken = body?.data?.bootstrapToken;

  expect(bootstrapToken, 'bootstrapToken should exist').toBeTruthy();

  const jwtPayload = decodeJwtPayload(bootstrapToken);

  refreshToken =
    jwtPayload.refreshToken ||
    jwtPayload.refresh_token ||
    jwtPayload.rt;

  expect(refreshToken, 'refreshToken should exist').toBeTruthy();

  console.log('Refresh token generated successfully');
});

test('02 - Refresh Token API', async ({ request }) => {
  const apiBaseUrl = getApiBaseUrl();

  const response = await request.post(`${apiBaseUrl}admin/api/v1/auth/refresh`, {
    headers: {
      'X-Authenticated-User': 'abc',
      'X-Device-ID': 'abc',
      'Content-Type': 'application/json',
    },
    data: {
      refreshToken,
    },
  });

  expect(response.status()).toBe(200);

  const body = await response.json();

  authToken =
    body?.data?.accessToken ||
    body?.accessToken ||
    body?.token;

  expect(authToken, 'authToken should exist').toBeTruthy();

  console.log('Auth token generated successfully');
});

test('03 - GEO Token Refresh API', async ({ request }) => {
  const apiBaseUrl = getApiBaseUrl();

  const response = await request.post(`${apiBaseUrl}admin/api/v1/geo-tokens/refresh`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'X-Authenticated-User': 'abc',
      'X-Device-ID': 'abc',
    },
    data: {
      storeId: 7960,
      latitude: 40.250001,
      longitude: -75.250001,
    },
  });

  expect(response.status()).toBe(200);

  const body = await response.json();

  geoToken =
    body?.data?.geoToken ||
    body?.geoToken ||
    body?.token;

  expect(geoToken, 'geoToken should exist').toBeTruthy();

  console.log('Geo token generated successfully');
});

test('04 - Summary API', async ({ request }) => {
  const apiBaseUrl = getApiBaseUrl();

  const response = await request.get(`${apiBaseUrl}workorder/api/v1/shop-activity/summary`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'X-Geo-Token': geoToken,
      'X-Authenticated-User': 'DummyValue123',
      'X-Device-ID': 'DummyValue123',
      'Content-Type': 'application/json',
    },
  });

  expect(response.status()).toBe(200);
  console.log('Summary API Status:', response.status());
  console.log('Summary API Body:', await response.text());

  const body = await response.json();

  expect(body).toBeTruthy();
});

test.skip('05 - Work Order List API', async ({ request }) => {
  const apiBaseUrl = getApiBaseUrl();

  const response = await request.get(`${apiBaseUrl}workorder/api/v1/shop-activity/work-orders`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'X-Geo-Token': geoToken,
      'X-Authenticated-User': 'DummyValue123',
      'X-Device-ID': 'DummyValue123',
      'Content-Type': 'application/json',
    },
  });

  expect(response.status()).toBe(200);
  console.log('Work Order List API Status:', response.status());
  console.log('Work Order List API Body:', await response.text());

  const body = await response.json();

  expect(body).toBeTruthy();
});

test('06 - New Work Order API', async ({ request }) => {
  const apiBaseUrl = getApiBaseUrl();

  const response = await request.post(`${apiBaseUrl}workorder/api/v1/work-orders/draft`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'X-Geo-Token': geoToken,
      'X-Authenticated-User': 'DummyValue123',
      'X-Device-ID': 'DummyValue123',
      'Content-Type': 'application/json',
    },
    data: {
      swoType: 'Retail',
      sourceType: 'ShopX_Nextgen',
    },
  });
console.log('New Work Order Status:', response.status());
console.log('New Work Order Body:', await response.text());
  expect([200, 201]).toContain(response.status());

  const body = await response.json();

  workOrderId =
    body?.data?.swoId ||
    body?.data?.workOrderId ||
    body?.workOrderId ||
    body?.id;

  expect(workOrderId, 'workOrderId should exist').toBeTruthy();

  console.log(`Work Order ID: ${workOrderId}`);
});