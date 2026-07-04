# PBYUI Framework Onboarding

This guide helps a new contributor get productive in the `PBYUI-framework` Playwright automation repo. The framework is built with Playwright, TypeScript, Page Object Model classes, OneProtect/SSO authentication setup, reusable browser storage state, and a GitHub Actions test workflow.

## 1. What This Framework Does

The framework automates browser tests for an application that redirects users through OneProtect/SSO and then returns them to the application after login.

The main flow is:

1. Open the application from `BASE_URL`.
2. Redirect to OneProtect/SSO.
3. Enter the configured username and password.
4. Return to the application.
5. Verify the home page is loaded.
6. Save the authenticated browser session to `playwright/.auth/user.json`.
7. Reuse that saved session in normal tests.

## 2. Repository Map

```text
PBYUI-framework/
|-- .github/workflows/
|   `-- playwright.yml              # GitHub Actions workflow
|-- config/
|   `-- env.ts                      # Environment variable loading and validation
|-- test-data/
|   `-- users.json                  # Test data
|-- tests/
|   |-- pages/
|   |   |-- BasePage.ts             # Shared page object behavior
|   |   |-- HomePage.ts             # Home page assertions and locators
|   |   `-- OneProtectLoginPage.ts  # OneProtect login flow
|   |-- setup/
|   |   `-- auth.setup.ts           # Login setup and storage state creation
|   `-- specs/
|       |-- api/                    # API specs
|       |-- AWSSecretverification.spec.ts
|       `-- SmokeTest.spec.ts
|-- utils/
|   |-- logger.ts                   # Console logger helper
|   `-- waitUtils.ts                # Page wait helpers
|-- .env.example                    # Example local environment variables
|-- package.json                    # NPM scripts and dependencies
|-- playwright.config.ts            # Playwright projects, reporters, retries, browser config
`-- tsconfig.json                   # TypeScript compiler config
```

## 3. Prerequisites

Install these before running the framework locally:

- Node.js 20 or later
- npm
- Git
- Access to the target test environment
- A OneProtect/SSO test account that is safe for automation

Recommended account setup:

- Use a lower-environment test user.
- Avoid MFA, CAPTCHA, authenticator approval, and one-time-password prompts for automated CI runs.
- Do not use a personal account or production credential.

## 4. Local Setup

Install dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npm run install:browsers
```

Create a local `.env` file:

```bash
cp .env.example .env
```

Update `.env` with local values:

```bash
BASE_URL=https://your-application-url.example
APP_USER=your.automation.user
APP_PASS=your.automation.password
CI=false
```

Security note: `.env` must stay local and should not be committed. The public `.env.example` file should contain placeholders only, not real usernames or passwords.

## 5. First Successful Run

Run the authentication setup first:

```bash
npm run test:auth
```

This opens a headed browser, logs in through OneProtect, verifies the app home page, and writes the authenticated session here:

```text
playwright/.auth/user.json
```

After auth succeeds, run the full suite:

```bash
npm test
```

Open the Playwright HTML report:

```bash
npm run report
```

## 6. Useful Test Commands

```bash
npm test
```

Runs all Playwright tests.

```bash
npm run test:headed
```

Runs tests in headed browser mode.

```bash
npm run test:debug
```

Runs tests in Playwright debug mode.

```bash
npm run test:ui
```

Opens the Playwright UI runner.

```bash
npm run test:auth
```

Runs only the login setup test and refreshes `playwright/.auth/user.json`.

```bash
npm run codegen
```

Starts Playwright code generation for discovering locators.

## 7. How Authentication Works

Authentication is split from the normal test specs.

The `setup` Playwright project runs `tests/setup/auth.setup.ts`. That setup test:

1. Validates required environment variables from `config/env.ts`.
2. Navigates to `BASE_URL`.
3. Uses `OneProtectLoginPage` to submit credentials.
4. Waits for the redirect back from OneProtect.
5. Uses `HomePage.verifyLoaded()` to confirm the app is ready.
6. Saves storage state to `playwright/.auth/user.json`.

The `chromium` project depends on `setup` and uses:

```ts
storageState: 'playwright/.auth/user.json'
```

This means normal tests start already logged in.

## 8. Adding a New UI Test

Use this pattern for new browser tests:

1. Add or update a page object in `tests/pages/`.
2. Put stable locators and page-specific actions in the page object.
3. Add the spec under `tests/specs/`.
4. Keep test assertions focused on user-visible behavior.
5. Avoid hard-coded waits. Prefer Playwright locators, web assertions, and shared wait helpers.

Example spec structure:

```ts
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test('user can open the home page', async ({ page }) => {
  const homePage = new HomePage(page);

  await page.goto('/');
  await homePage.verifyLoaded();

  await expect(page).toHaveURL(/.+/);
});
```

## 9. Updating Locators

If a locator breaks after an application change, use Playwright codegen:

```bash
npm run codegen -- https://your-application-url.example
```

Recommended locator priority:

1. `getByRole()` with accessible names.
2. `getByLabel()` or `getByPlaceholder()` for form fields.
3. `getByText()` for stable visible text.
4. CSS locators only when semantic locators are not reliable.

Keep locators in page object files instead of duplicating them across specs.

## 10. CI Setup

The GitHub Actions workflow runs on:

- pushes to `main`
- pull requests targeting `main`
- manual `workflow_dispatch`

Add these repository secrets before expecting CI to pass:

```text
BASE_URL
APP_USER
APP_PASS
```

The workflow installs dependencies with `npm ci`, installs Playwright browsers with dependencies, runs `npx playwright test`, and uploads `playwright-report/` as an artifact.

CI uses:

```text
CI=true
```

In CI, the Playwright config runs with:

- `forbidOnly: true`
- `retries: 1`
- `workers: 1`
- screenshots only on failure
- videos retained on failure
- traces on first retry

## 11. Troubleshooting

### Missing environment values

Symptom:

```text
Missing required env values: BASE_URL, APP_USER, APP_PASS
```

Fix:

1. Confirm `.env` exists locally.
2. Confirm `BASE_URL`, `APP_USER`, and `APP_PASS` are populated.
3. In GitHub Actions, confirm repository secrets exist with the same names.

### Login page locator fails

Likely cause: OneProtect changed the username, password, Continue, or submit button markup.

Fix:

1. Run headed auth: `npm run test:auth`.
2. Run codegen against the app.
3. Update `tests/pages/OneProtectLoginPage.ts`.
4. Re-run `npm run test:auth`.

### Home page verification fails

Likely cause: the post-login landing page changed or the `New Work Order` locator no longer matches.

Fix:

1. Log in manually and confirm the expected landing page.
2. Update `tests/pages/HomePage.ts`.
3. Prefer a stable role, label, or test id if the app provides one.

### Tests pass locally but fail in CI

Common causes:

- CI secrets are missing or stale.
- The automation account requires MFA in CI.
- The target environment blocks GitHub-hosted runners.
- The app is slower in CI and needs better readiness checks.
- A test depends on local browser state that is not created in CI.

Start by downloading the Playwright report artifact from the failed workflow run.

### Authentication state is stale

Fix:

```bash
rm -f playwright/.auth/user.json
npm run test:auth
```

## 12. Maintainer Recommendations

These changes would make the framework easier to maintain:

1. Replace any real-looking values in `.env.example` with safe placeholders.
2. Add `playwright/.auth/` to `.gitignore` if it is not already ignored.
3. Format TypeScript files with a consistent formatter so future diffs are easier to review.
4. Consider adding `data-testid` attributes in the app for critical test flows.
5. Add a short pull request checklist for locator changes, auth changes, and CI validation.
6. Pin Playwright and TypeScript versions instead of using `latest` for more stable CI.

## 13. Pull Request Checklist

Before opening a PR:

- Run `npm test` locally when credentials and test environment access are available.
- Run `npm run test:auth` if the login flow, environment config, or home page locator changed.
- Confirm no credentials, storage state, reports, screenshots, videos, or traces are committed.
- Update page objects when selectors change.
- Update this onboarding guide when setup, commands, or CI behavior changes.

## 14. Quick Reference


```bash
npm install
npm run install:browsers
cp .env.example .env
npm run test:auth
npm test
npm run report
```
