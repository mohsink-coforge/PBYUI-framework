import { Page } from '@playwright/test';
import crypto from 'crypto';
import { OneProtectLoginPage } from '../../tests/pages/OneProtectLoginPage';

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env value: ${name}`);
  }

  return value;
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
  const codeVerifier = required('OAUTH_CODE_VERIFIER');
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: required('OAUTH_CLIENT_ID'),
    redirect_uri: required('OAUTH_REDIRECT_URI'),
    scope: process.env.OAUTH_SCOPE || 'openid profile email params',
    state: process.env.OAUTH_STATE || 'abc123',
    code_challenge: codeChallenge,
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

export async function getFreshAuthCode(page: Page): Promise<string> {
  const oauthUrl = buildOAuthUrl();

  await page.goto(oauthUrl, { waitUntil: 'domcontentloaded' });

  const currentCode = extractCodeFromUrl(page.url());

  if (currentCode) {
    return currentCode;
  }

  const usernameInput = page
    .locator('input[name="username"], input[type="email"], input[placeholder*="Username"], input[placeholder*="Email"]')
    .first();

  const isLoginPage = await usernameInput
    .isVisible({ timeout: 10_000 })
    .catch(() => false);

  if (isLoginPage) {
    const loginPage = new OneProtectLoginPage(page);

    await loginPage.login(
      required('APP_USER'),
      required('APP_PASS')
    );
  }

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