import { Page, expect } from '@playwright/test';
import { waitForPageReady } from '../../utils/waitUtils';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await waitForPageReady(this.page);
  }

  async verifyPageTitleContains(text: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(text, 'i'));
  }
}
