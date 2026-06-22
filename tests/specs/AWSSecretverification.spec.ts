import { test, expect, Page } from '@playwright/test';
import path from 'path';
import * as XLSX from 'xlsx';

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readSecretsFromExcel(
  filePath: string,
  sheetName: string
): Record<string, string> {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(
      `Sheet not found: ${sheetName}. Available sheets: ${workbook.SheetNames.join(', ')}`
    );
  }

  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    defval: '',
  });

  const secrets: Record<string, string> = {};

  for (let i = 1; i < rows.length; i++) {
    const key = normalizeText(rows[i][0]);
    const value = normalizeText(rows[i][1]);

    if (key) {
      secrets[key] = value;
    }
  }

  console.log(`Excel Sheet Used: ${sheetName}`);
  console.log(`Excel Secrets Loaded: ${Object.keys(secrets).length}`);

  return secrets;
}

async function getAllSecretsFromUI(page: Page): Promise<Record<string, string>> {
  const uiSecrets: Record<string, string> = {};

  const rows = page.locator('tr[data-selection-item="item"]');
  await expect(rows.first()).toBeVisible();

  let previousCount = 0;
  let sameCount = 0;

  while (sameCount < 12) {
    const visibleSecrets = await page.locator('tr[data-selection-item="item"]').evaluateAll((rows) => {
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return {
          key: cells[0]?.textContent ?? '',
          value: cells[1]?.textContent ?? '',
        };
      });
    });

    for (const item of visibleSecrets) {
      const key = normalizeText(item.key);
      const value = normalizeText(item.value);

      if (key) {
        uiSecrets[key] = value;
      }
    }

    const currentCount = Object.keys(uiSecrets).length;

    if (currentCount === previousCount) {
      sameCount++;
    } else {
      sameCount = 0;
      previousCount = currentCount;
    }

    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
  }

  console.log(`UI Secrets Collected: ${Object.keys(uiSecrets).length}`);

  return uiSecrets;
}
async function verifyExcelDataWithUI(
  page: Page,
  excelFileName: string,
  sheetName: string
) {
  const excelPath = path.resolve(process.cwd(), 'test-data', excelFileName);
  const expectedSecrets = readSecretsFromExcel(excelPath, sheetName);

  const uiSecrets = await getAllSecretsFromUI(page);

  const matchedData: string[] = [];
  const mismatchedData: string[] = [];

  for (const [secretKey, expectedValue] of Object.entries(expectedSecrets)) {
    const normalizedKey = normalizeText(secretKey);
    const normalizedExpectedValue = normalizeText(expectedValue);
    const uiValue = uiSecrets[normalizedKey];

    if (uiValue === undefined) {
      mismatchedData.push(
        `KEY NOT FOUND | Key: ${normalizedKey} | Excel Value: ${normalizedExpectedValue} | UI Value: NOT FOUND`
      );
      continue;
    }

    const normalizedUiValue = normalizeText(uiValue);

    if (normalizedUiValue === normalizedExpectedValue) {
      matchedData.push(
        `MATCHED | Key: ${normalizedKey} | Value: ${normalizedUiValue}`
      );
    } else {
      mismatchedData.push(
        `MISMATCH | Key: ${normalizedKey} | Excel Value: ${normalizedExpectedValue} | UI Value: ${normalizedUiValue}`
      );
    }
  }

  console.log('\n========== MATCHED DATA ==========');
  matchedData.forEach((item) => console.log(item));

  console.log('\n========== MISMATCHED DATA ==========');
  mismatchedData.forEach((item) => console.log(item));

  console.log(`Total Matched: ${matchedData.length}`);
  console.log(`Total Mismatched: ${mismatchedData.length}`);

  expect(
    mismatchedData,
    `Some secrets did not match:\n${mismatchedData.join('\n')}`
  ).toHaveLength(0);
}

test.describe('AWS Console Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.ONE_LOGIN_DASHBOARD!);
  });

  test('Verify AWS Secrets in US-East-1', async ({ page }) => {
    await page.goto(process.env.ONE_LOGIN_DASHBOARD!);
    console.log('Navigated to OneLogin Dashboard');

    await page.getByRole('button', { name: 'Company: Everything' }).click();
    console.log('Clicked on Company: Everything button, waiting for AWS Console popup...');

    const page1Promise = page.waitForEvent('popup');

    await page.getByRole('link', { name: 'Launch Pep Boys Amazon Web' }).click();

    const page1 = await page1Promise;
    console.log('AWS Console popup opened');

    await page1
      .getByText('Account: service-qatest-1 (714179603964) IAH_DeveloperAccess_SAML')
      .click();

    await page1
      .locator('[id="arn:aws:iam::714179603964:role/IAH_DeveloperAccess_SAML"]')
      .check();

    await page1.getByRole('link', { name: 'Sign in' }).click();

    await page1.goto(
      'https://us-east-1.console.aws.amazon.com/secretsmanager/listsecrets?region=us-east-1'
    );

    await expect(
      page1.getByRole('link', { name: 'pby/shopx/qa/global/be' })
    ).toBeVisible();

    await page1.getByRole('link', { name: 'pby/shopx/qa/global/be' }).click();

    await page1.locator('[data-test-id="retrieve-creds"]').click();

    await expect(page1.locator('tr[data-selection-item="item"]').first()).toBeVisible();

    await verifyExcelDataWithUI(
      page1,
      'aws-secrets-expected-values.xlsx',
      'East'
    );
  });

  test('Verify AWS Secrets in US-West-2', async ({ page }) => {
    await page.goto(process.env.ONE_LOGIN_DASHBOARD!);
    console.log('Navigated to OneLogin Dashboard');

    await page.getByRole('button', { name: 'Company: Everything' }).click();

    const page1Promise = page.waitForEvent('popup');

    await page.getByRole('link', { name: 'Launch Pep Boys Amazon Web' }).click();

    const page1 = await page1Promise;

    await page1
      .getByText('Account: service-qatest-1 (714179603964) IAH_DeveloperAccess_SAML')
      .click();

    await page1
      .locator('[id="arn:aws:iam::714179603964:role/IAH_DeveloperAccess_SAML"]')
      .check();

    await page1.getByRole('link', { name: 'Sign in' }).click();

    await page1.goto(
      'https://us-west-2.console.aws.amazon.com/secretsmanager/listsecrets?region=us-west-2#'
    );

    await expect(
      page1.getByRole('link', { name: 'pby/shopx/qa/global/be' })
    ).toBeVisible();

    await page1.getByRole('link', { name: 'pby/shopx/qa/global/be' }).click();

    await page1.locator('[data-test-id="retrieve-creds"]').click();

    await expect(page1.locator('tr[data-selection-item="item"]').first()).toBeVisible();

    await verifyExcelDataWithUI(page1,'aws-secrets-expected-values.xlsx','West');
  });
});