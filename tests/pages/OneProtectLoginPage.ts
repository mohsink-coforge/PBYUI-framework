import { Page, Locator, expect } from '@playwright/test';

export class OneProtectLoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.getByPlaceholder(/username|user name|email/i).or(page.locator('input[name*="user" i], input[id*="user" i], input[type="email"]')).first();
    this.passwordInput = page.getByPlaceholder(/password/i).or(page.locator('input[type="password"], input[name*="pass" i], input[id*="pass" i]')).first();
    this.loginButton = page.getByRole('button', { name: /login|log in|sign in|submit/i }).or(page.locator('button[type="submit"], input[type="submit"]')).first();
  }

  async login(username: string, password: string): Promise<void> {
    await expect(this.usernameInput).toBeVisible({ timeout: 60_000 });
    await this.usernameInput.fill(username);
    await this.page.getByRole('button', { name: 'Continue' }).click();
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
