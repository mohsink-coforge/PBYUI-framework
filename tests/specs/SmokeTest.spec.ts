import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { CustomerSearchPage } from '../pages/CustomerSearchPage';



// This test uses the saved session from tests/setup/auth.setup.ts.
test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto('/');
    await homePage.verifyLoaded();
  });

  // test('should open home page after OneProtect authenticated session is reused', async ({ page }) => {
  //   // Already handled in beforeEach
  //   await expect(page).not.toHaveURL(/login|oneprotect/i);
  // });

  test('Search customer by phone number and continue', async ({ page }) => {
     const homePage = new HomePage(page);
    //await homePage.createNewButton.click();
    const customerSearchPage = new CustomerSearchPage(page);

    await customerSearchPage.openNewCustomerSearch();
    console.log('Clicked on New Work Order button');
    await customerSearchPage.searchByPhoneNumber('(801) 010-5016');
    console.log('Searched by phone number');
    await customerSearchPage.selectCustomer('Mohsin Khan');
    console.log('Selected customer');
    await customerSearchPage.continueToNextStep();
    console.log('Clicked continue to next step');
    await expect(page).not.toHaveURL(/customer-search/i);
    console.log('Verified that customer search page is not visible');
    await page.locator('app-page-header').getByText('Customer Information').isVisible();
    console.log('Verified that customer information page is visible');
    await page.getByRole('radiogroup', { name: 'Toggle Button' }).isVisible()
    console.log('Verified that toggle button is visible');


  });

test(' Verify Homepage elements', async ({ page }) => {
  await page.getByRole('button', { description: 'Show side navigation', exact: true }).click();
  console.log('Clicked on side navigation button');
  await page.getByRole('link', { name: 'Dashboard' }).isVisible();
  console.log('Verified that Dashboard link is visible');
  await page.getByRole('link', { name: 'Estimates' }).isVisible();
  console.log('Verified that Estimates link is visible');
  await page.getByRole('button', { name: 'Orders Management' }).isVisible();
  console.log('Verified that Orders Management link is visible');
  await page.getByRole('link', { name: 'Appointments' }).click();
  await page.getByRole('button', { name: 'arrow_back', exact: true }).click();
  await page.getByRole('button', { description: 'Show side navigation', exact: true }).click();

   });
test('Create New Customer', async ({ page }) => {
  const randomNum = Date.now().toString().slice(-6);

  const customer = {

    address: '5444',
    zipCode: '75056',
    phone: `7112${randomNum}`,
    email: `testautomation${randomNum}@gmail.com`
  };

  await page.getByRole('button', { name: 'expand_more' }).first().click();
  await page.getByRole('menuitem', { name: 'Retail' }).click();

  await page.getByRole('textbox', { name: 'Enter the Phone Number' }).fill(customer.phone);
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByText("error We couldn't find any")).toBeVisible();

  await page.getByRole('button', { name: 'New Customer' }).click();

  await page.getByRole('textbox', { name: 'Enter Name' }).fill("Test");
  await page.getByRole('textbox', { name: 'Enter Last Name' }).fill("User");
  await page.getByRole('textbox', { name: 'Enter Address' }).fill(customer.address);
  await page.getByRole('textbox', { name: 'Enter Zip Code' }).fill(customer.zipCode);

  await page.getByRole('button', { name: 'Search', exact: true }).click();

  //await page.locator('#mat-select-value-1').click();
  //await page.getByRole('option', { name: 'Puebla' }).click();

  await page.getByRole('textbox', { name: 'Enter Phone Number' }).fill(customer.phone);

  await page.getByText('keyboard_arrow_down').nth(2).click();
  await page.getByText('Mobile – Personal').click();

  await page
    .getByRole('textbox', { name: 'Enter email address (e.g.,' })
    .fill(customer.email);

  await page.getByRole('button', { name: 'Create new customer' }).click();

  await page.getByRole('button', { name: 'Add Vehicle' }).nth(1).click();
  await page.getByRole('button', { name: 'No Vehicle' }).click();
  await page.getByRole('button', { name: 'Yes, continue with No Vehicle' }).click();

  await page.getByRole('button', { name: 'Create new customer' }).click();
});

test('Add new vehicle', async ({ page }) => {
  const randomNum = Date.now().toString().slice(-6);

  const customer = {

    address: '5444',
    zipCode: '75056',
    phone: `7112${randomNum}`,
    email: `testautomation${randomNum}@gmail.com`
  };

  await page.getByRole('button', { name: 'expand_more' }).first().click();
  await page.getByRole('menuitem', { name: 'Retail' }).click();

  await page.getByRole('textbox', { name: 'Enter the Phone Number' }).fill(customer.phone);
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByText("error We couldn't find any")).toBeVisible();

  await page.getByRole('button', { name: 'New Customer' }).click();

  await page.getByRole('textbox', { name: 'Enter Name' }).fill("Test");
  await page.getByRole('textbox', { name: 'Enter Last Name' }).fill("User");
  await page.getByRole('textbox', { name: 'Enter Address' }).fill(customer.address);
  await page.getByRole('textbox', { name: 'Enter Zip Code' }).fill(customer.zipCode);

  await page.getByRole('button', { name: 'Search', exact: true }).click();

  //await page.locator('#mat-select-value-1').click();
  //await page.getByRole('option', { name: 'Puebla' }).click();

  await page.getByRole('textbox', { name: 'Enter Phone Number' }).fill(customer.phone);

  await page.getByText('keyboard_arrow_down').nth(2).click();
  await page.getByText('Mobile – Personal').click();

  await page
    .getByRole('textbox', { name: 'Enter email address (e.g.,' })
    .fill(customer.email);

  await page.getByRole('button', { name: 'Create new customer' }).click();

  await page.getByRole('button', { name: 'Add Vehicle' }).nth(1).click();
  await page.getByRole('textbox', { name: 'Enter License Plate' }).click();
  await page.getByRole('textbox', { name: 'Enter License Plate' }).fill('RST4521');
  await page.locator('app-get-vehicle-info').getByText('keyboard_arrow_down').click();
  await page.getByRole('option', { name: 'Texas' }).click();
  await page.getByRole('button', { name: 'Retrieve vehicle info' }).click();
 // await page.getByRole('textbox', { name: 'Enter Vehicle Identification' }
   await page.locator('#mat-input-22').click();
   await page.getByRole('option', { name: 'Brown' }).click();
  await page.getByRole('textbox', { name: 'Enter Mileage in' }).click();
  await page.getByRole('textbox', { name: 'Enter Mileage in' }).fill('40000');
  await page.locator('mat-dialog-content').click();
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByText('Vehicle Added Successfully').click();
});

test('Add a Service', async ({ page }) => {
  const randomNum = Date.now().toString().slice(-6);

  const customer = {

    address: '5444',
    zipCode: '75056',
    phone: `7112${randomNum}`,
    email: `testautomation${randomNum}@gmail.com`
  };

  await page.getByRole('button', { name: 'expand_more' }).first().click();
  await page.getByRole('menuitem', { name: 'Retail' }).click();

  await page.getByRole('textbox', { name: 'Enter the Phone Number' }).fill(customer.phone);
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByText("error We couldn't find any")).toBeVisible();

  await page.getByRole('button', { name: 'New Customer' }).click();

  await page.getByRole('textbox', { name: 'Enter Name' }).fill("Test");
  await page.getByRole('textbox', { name: 'Enter Last Name' }).fill("User");
  await page.getByRole('textbox', { name: 'Enter Address' }).fill(customer.address);
  await page.getByRole('textbox', { name: 'Enter Zip Code' }).fill(customer.zipCode);

  await page.getByRole('button', { name: 'Search', exact: true }).click();

  //await page.locator('#mat-select-value-1').click();
  //await page.getByRole('option', { name: 'Puebla' }).click();

  await page.getByRole('textbox', { name: 'Enter Phone Number' }).fill(customer.phone);

  await page.getByText('keyboard_arrow_down').nth(2).click();
  await page.getByText('Mobile – Personal').click();

  await page
    .getByRole('textbox', { name: 'Enter email address (e.g.,' })
    .fill(customer.email);

  await page.getByRole('button', { name: 'Create new customer' }).click();

  await page.getByRole('button', { name: 'Add Vehicle' }).nth(1).click();
  await page.getByRole('textbox', { name: 'Enter License Plate' }).click();
  await page.getByRole('textbox', { name: 'Enter License Plate' }).fill('RST4521');
  await page.locator('app-get-vehicle-info').getByText('keyboard_arrow_down').click();
  await page.getByRole('option', { name: 'Texas' }).click();
  await page.getByRole('button', { name: 'Retrieve vehicle info' }).click();
 // await page.getByRole('textbox', { name: 'Enter Vehicle Identification' }
  await page.locator('#mat-input-22').click();
 await page.getByRole('option', { name: 'Brown' }).click();
  await page.getByRole('textbox', { name: 'Enter Mileage in' }).click();
  await page.getByRole('textbox', { name: 'Enter Mileage in' }).fill('40000');
  await page.locator('mat-dialog-content').click();
  await page.getByRole('button', { name: 'Add' }).click();
  await page.getByText('Vehicle Added Successfully').click();
  await page.getByRole('button', { name: 'Create new customer' }).click();
  await page.getByText('Recommended Services').isVisible();
  await page.getByText('By Mileage').isVisible();
  await page.getByText('By Time').isVisible();
  await page.getByText('By Indicator Code').isVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Services', { exact: true })
  await page.getByRole('button', { name: 'Tire Replacement' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'P275/45R22 112 V XL' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
});



});