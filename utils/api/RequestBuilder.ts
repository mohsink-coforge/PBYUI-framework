import { PostmanStep, RuntimeVariables } from './types';
import { runtime } from './RuntimeManager';

const IGNORED_HEADER_KEYS = new Set([
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
]);

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env value: ${name}`);
  }

  return value;
}

export function getApiBaseUrl(): string {

  const apiEnv = (process.env.API_ENV || 'east').toLowerCase();

  const environments: Record<string, string | undefined> = {
    east: process.env.API_QA_EAST,
    west: process.env.API_QA_WEST,
    shopx: process.env.API_SHOPX,
  };

  const value = environments[apiEnv];

  if (!value) {
    throw new Error(
      `Unknown API environment '${apiEnv}'. Supported values: east, west, shopx`
    );
  }

  return value.endsWith('/')
    ? value
    : `${value}/`;
}

function replaceRuntimeVariables(value: string): string {
  const apiBaseUrl = getApiBaseUrl();

  return value
    .replace(/{{QA}}\//g, apiBaseUrl)
    .replace(/{{QA}}/g, apiBaseUrl)
    .replace(/{{authCode}}/g, runtime.authCode || '')
    .replace(/{{refreshToken}}/g, runtime.refreshToken || '')
    .replace(/{{authToken}}/g, runtime.authToken || '')
    .replace(/{{geoToken}}/g, runtime.geoToken || '')
    .replace(/{{workOrderId}}/g, runtime.workOrderId || '')
    .replace(/{{appointmentId}}/g, runtime.appointmentId || '');
}

export function buildUrl(step: PostmanStep): string {
  if (!step.rawUrl) {
    throw new Error(`URL not found for step: ${step.name}`);
  }

  return replaceRuntimeVariables(step.rawUrl);
}

export function buildBody(step: PostmanStep): any {
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

export function buildHeaders(step: PostmanStep): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(step.headers || {})) {
    const lowerKey = key.toLowerCase();

    if (IGNORED_HEADER_KEYS.has(lowerKey)) {
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
