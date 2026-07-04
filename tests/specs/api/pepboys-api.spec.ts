import { test, expect } from '@playwright/test';
import { loadPostmanSteps } from '../../../utils/api/PostmanCollectionReader';
import { loadRuntime } from '../../../utils/api/RuntimeManager';
import { runPostmanStep } from '../../../utils/api/PostmanRunner';

const steps = loadPostmanSteps();

expect(steps.length, 'Postman collection should contain 60 API requests').toBe(60);

// Keep default mode. With fullyParallel=false and one spec file, tests run in file order.
// Do not use serial mode, because serial mode skips remaining tests after one failure.
test.describe.configure({ mode: 'default' });

test.beforeEach(() => {
  loadRuntime();
});

steps.forEach((step, index) => {
  const title = `${String(index + 1).padStart(2, '0')} - ${[...step.folderPath, step.name]
    .filter(Boolean)
    .join(' > ')}`;

 test(title, async ({ request, browser }) => {
  await runPostmanStep(index, steps, request, index === 0 ? browser : undefined);
});
});
