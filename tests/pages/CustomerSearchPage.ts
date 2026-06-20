import { Page, expect } from '@playwright/test';

export class CustomerSearchPage {
  constructor(private page: Page) {}

  async openNewCustomerSearch() {
    await this.page.getByText('New Work Order', { exact: true }).click();
  }

  async searchByPhoneNumber(phoneNumber: string) {
    await expect(this.page.getByText('Select a search method')).toBeVisible();

   await this.page.getByRole('textbox', { name: 'Enter the Phone Number' }).click();

    await this.page.getByRole('textbox', { name: 'Enter the Phone Number' }).fill(phoneNumber);

    await this.page.locator('app-button:has-text("Search")').click();
  }

  async selectCustomer(customerName: string) {
    await expect(this.page.getByText(customerName)).toBeVisible({ timeout: 30000 });

    await this.page
    .locator('div[role="row"]')
    .filter({ hasText: customerName })
    .locator('.ag-selection-checkbox')
    .click();

  }

  async continueToNextStep() {
    await this.page.getByRole('button', { name: /Continue/i }).click();
  }
}