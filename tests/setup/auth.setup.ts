import { test as setup, expect } from '@playwright/test';
import { env, validateRequiredEnv } from '../../config/env';
import { OneProtectLoginPage } from '../pages/OneProtectLoginPage';
import { HomePage } from '../pages/HomePage';
import { Logger } from '../../utils/logger';

setup('authenticate through OneProtect and save session', async ({ page }) => {
  validateRequiredEnv();

  Logger.info('Opening application URL');
  await page.goto(env.baseUrl);

  Logger.info('Logging in through OneProtect');
  const loginPage = new OneProtectLoginPage(page);
  await loginPage.login(env.username, env.password);

  Logger.info('Waiting for redirect back to application');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForURL(url => !url.toString().toLowerCase().includes('oneprotect'), { timeout: 90_000 }).catch(() => undefined);

  const homePage = new HomePage(page);
  await homePage.verifyLoaded();

  await expect(page).not.toHaveURL(/login|oneprotect/i);

  Logger.info('Saving authenticated browser state');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });

  
});



