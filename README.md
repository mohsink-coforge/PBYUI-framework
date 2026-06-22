# OneProtect Playwright Automation Framework

This is a Playwright TypeScript framework for applications that redirect to OneProtect/SSO login and then return to the application home page.

## What is included

- Playwright + TypeScript setup
- OneProtect login setup test
- Session reuse using `storageState`
- Page Object Model structure
- Environment based credentials
- Sample home page test
- HTML reports, screenshots, videos, and traces
- GitHub Actions workflow

## Folder structure

```text
oneprotect-playwright-framework/
├── config/
│   └── env.ts
├── tests/
│   ├── pages/
│   │   ├── BasePage.ts
│   │   ├── HomePage.ts
│   │   └── OneProtectLoginPage.ts
│   ├── setup/
│   │   └── auth.setup.ts
│   └── specs/
│       └── home.spec.ts
├── utils/
│   ├── logger.ts
│   └── waitUtils.ts
├── test-data/
│   └── users.json
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Setup

Install dependencies:

```bash
npm install
npx playwright install
```

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Update `.env`:

```env
BASE_URL=https://your-application-url.com
APP_USER=your.oneprotect.username
APP_PASS=your.oneprotect.password
```

## Run authentication setup

```bash
npm run test:auth
```

This logs in through OneProtect and saves the browser session here:

```text
playwright/.auth/user.json
```

## Run tests

```bash
npm test
```

Headed mode:

```bash
npm run test:headed
```

Debug mode:

```bash
npm run test:debug
```

View report:

```bash
npm run report
```

## Important notes for OneProtect / SSO

If your OneProtect flow has MFA, OTP, authenticator approval, or CAPTCHA, full automation may not be stable. Recommended options:

1. Use a lower-environment test user without MFA.
2. Run `npm run test:auth` manually once and reuse `storageState`.
3. Ask the security/admin team for an automation-safe SSO test account.

## Updating selectors

If login selectors do not work, run:

```bash
npx playwright codegen https://your-application-url.com
```

Perform the login manually and copy the exact locators into:

```text
tests/pages/OneProtectLoginPage.ts
```

Update home page locators in:

```text
tests/pages/HomePage.ts
```

## CI secrets

For GitHub Actions, add these repository secrets:

- `BASE_URL`
- `APP_USER`
- `APP_PASS`
