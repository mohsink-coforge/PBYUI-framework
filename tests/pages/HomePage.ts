import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
 // readonly homePageText: Locator;
  readonly createNewButton: Locator;

  constructor(page: Page) {
    super(page);
    //this.homePageText = page.getByText(/home page/i).first();
    this.createNewButton = page.locator('span').filter({ hasText: 'New Work Order' }).first();
  }

  async verifyLoaded(): Promise<void> {
    await expect((this.createNewButton)).toBeVisible({ timeout: 60_000 });
   

  }
}
