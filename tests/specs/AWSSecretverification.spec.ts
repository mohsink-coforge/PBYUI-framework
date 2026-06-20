import { test, expect } from '@playwright/test';

test.describe('AWS Console Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.ONE_LOGIN_DASHBOARD!);

    // Agar already saved session use kar rahe ho
    //await expect(page).not.toHaveURL(/login|oneprotect/i);
  });

  test('Verify AWS Secrets in US-East-1', async ({ page }) => {
     await page.goto(process.env.ONE_LOGIN_DASHBOARD!);
     console.log('Navigated to OneLogin Dashboard');
   await page.getByRole('button', { name: 'Company: Everything' }).click();
    console.log('Clicked on Company: Everything button, waiting for AWS Console popup...');
  const page1Promise = page.waitForEvent('popup');
  console.log('Waiting for AWS Console popup...');
  await page.getByRole('link', { name: 'Launch Pep Boys Amazon Web' }).click();
  const page1 = await page1Promise;
  console.log('AWS Console popup opened');
  await page1.getByText('Account: service-qatest-1 (714179603964) IAH_DeveloperAccess_SAML').click();
  console.log('Clicked on AWS Account link, checking the role checkbox...');
  await page1.locator('[id="arn:aws:iam::714179603964:role/IAH_DeveloperAccess_SAML"]').check();
  console.log('Checked the role checkbox, clicking Sign in...');
  await page1.getByRole('link', { name: 'Sign in' }).click();
  console.log('Clicked Sign in, navigating to AWS Console...');
  await page1.goto('https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#');
  console.log('Navigated to AWS Console, opening region menu...');
  await page1.getByTestId('more-menu__awsc-nav-regions-menu-button').click();
  console.log('Clicked on region menu, selecting N. Virginia...');
  await page1.getByRole('link', { name: 'N. Virginia us-east-' }).click();
  console.log('Selected N. Virginia, clicking on concierge input...');
  await page1.getByTestId('awsc-concierge-input').click();
  console.log('Filled concierge input with "secret"...');
  await page1.getByTestId('awsc-concierge-input').fill('secret');
  console.log('Clicked on Secrets Manager link...');
  await page1.getByTestId('awsc-concierge-active-search-result').getByRole('link', { name: 'Secrets Manager' }).click();
  console.log('Navigated to Secrets Manager, verifying secret link...');
  await page1.goto('https://us-east-1.console.aws.amazon.com/secretsmanager/listsecrets?region=us-east-1');
  await page1.getByRole('link', { name: 'pby/shopx/qa/global/be' }).isVisible()
    await page1.getByRole('link', { name: 'pby/shopx/qa/global/be' }).click();
  console.log('pby/shopx/qa/global/be is visible, clicking on retrieve credentials...');
  await page1.locator('[data-test-id="retrieve-creds"]').click();
  });

  test('Verify AWS Secrets in US-West-2', async ({ page }) => {
     await page.goto(process.env.ONE_LOGIN_DASHBOARD!);
     console.log('Navigated to OneLogin Dashboard');
   await page.getByRole('button', { name: 'Company: Everything' }).click();
   console.log('Clicked on Company: Everything button, waiting for AWS Console popup...');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Launch Pep Boys Amazon Web' }).click();
  console.log('Waiting for AWS Console popup...');
  const page1 = await page1Promise;
  await page1.getByText('Account: service-qatest-1 (714179603964) IAH_DeveloperAccess_SAML').click();
  console.log('Clicked on AWS Account link, checking the role checkbox...');
  await page1.locator('[id="arn:aws:iam::714179603964:role/IAH_DeveloperAccess_SAML"]').check();
  console.log('Checked the role checkbox, clicking Sign in...');
  await page1.getByRole('link', { name: 'Sign in' }).click();
  console.log('Clicked Sign in, navigating to AWS Console...');
  await page1.goto('https://us-west-2.console.aws.amazon.com/console/home?region=us-west-2#');
  console.log('Navigated to AWS Console, opening region menu...');
  await page1.getByTestId('more-menu__awsc-nav-regions-menu-button').click();
  console.log('Clicked on region menu, selecting Oregon...');
  await page1.getByRole('link', { name: 'Oregon us-west-2' }).click();
  console.log('Selected Oregon, clicking on concierge input...');
  await page1.getByTestId('awsc-concierge-input').click();
  console.log('Filled concierge input with "secret"...');
  await page1.getByTestId('awsc-concierge-input').fill('secret');
  console.log('Clicked on Secrets Manager link...');
  await page1.getByTestId('awsc-concierge-active-search-result').getByRole('link', { name: 'Secrets Manager' }).click();
  console.log('Navigated to Secrets Manager, verifying secret link...');
  await page1.goto('https://us-west-2.console.aws.amazon.com/secretsmanager/listsecrets?region=us-west-2#');
  console.log('Navigated to Secrets Manager list, checking for secret link...');
  await page1.getByRole('link', { name: 'pby/shopx/qa/global/be' }).isVisible()
  await page1.getByRole('link', { name: 'pby/shopx/qa/global/be' }).click();
  console.log('pby/shopx/qa/global/be is visible, clicking on retrieve credentials...');
  await page1.locator('[data-test-id="retrieve-creds"]').click();
  console.log('Clicked on retrieve credentials, test completed.');
  });


}); 