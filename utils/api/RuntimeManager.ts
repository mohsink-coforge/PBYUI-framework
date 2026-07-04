import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { RuntimeVariables } from './types';

export const runtime: RuntimeVariables = {};

const runtimeFile = path.join(
  process.cwd(),
  'test-results',
  `runtime-vars-${(process.env.API_ENV || 'east').toLowerCase()}.json`
);

function maskRuntimeForLog(value?: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= 12) {
    return '********';
  }

  return `${value.substring(0, 6)}...${value.substring(value.length - 6)}`;
}

export function saveRuntime(): void {
  fs.mkdirSync(path.dirname(runtimeFile), { recursive: true });

  fs.writeFileSync(runtimeFile, JSON.stringify(runtime, null, 2));

  console.log(`Runtime saved: ${runtimeFile}`);
  console.log({
    authCode: maskRuntimeForLog(runtime.authCode),
    refreshToken: maskRuntimeForLog(runtime.refreshToken),
    authToken: maskRuntimeForLog(runtime.authToken),
    geoToken: maskRuntimeForLog(runtime.geoToken),
    workOrderId: runtime.workOrderId || '',
  });
}

export function loadRuntime(): void {
  if (!fs.existsSync(runtimeFile)) {
    return;
  }

  Object.assign(runtime, JSON.parse(fs.readFileSync(runtimeFile, 'utf8')));
}

export function clearRuntime(): void {
  if (fs.existsSync(runtimeFile)) {
    fs.unlinkSync(runtimeFile);
  }

  runtime.authCode = undefined;
  runtime.refreshToken = undefined;
  runtime.authToken = undefined;
  runtime.geoToken = undefined;
  runtime.workOrderId = undefined;

  console.log(`Runtime cleared: ${runtimeFile}`);
}
