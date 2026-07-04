import { expect } from '@playwright/test';
import { PostmanStep } from './types';
import { runtime, saveRuntime } from './RuntimeManager';

function decodeJwtPayload(token: string): any {
  const payload = token.split('.')[1];

  if (!payload) {
    throw new Error('Invalid JWT token. Payload part not found.');
  }

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');

  return JSON.parse(decoded);
}

export async function updateRuntimeVariables(
  step: PostmanStep,
  responseText: string
): Promise<void> {
  if (!responseText) {
    return;
  }

  let jsonData: any;

  try {
    jsonData = JSON.parse(responseText);
  } catch {
    return;
  }

  if (step.name === 'Auth Token') {
    const bootstrapToken = jsonData?.data?.bootstrapToken;

    expect(bootstrapToken, 'bootstrapToken should exist in Auth Token response').toBeTruthy();

    const jwtPayload = decodeJwtPayload(bootstrapToken);

    runtime.refreshToken =
      jwtPayload.refreshToken ||
      jwtPayload.refresh_token ||
      jwtPayload.rt;

    expect(runtime.refreshToken, 'refreshToken should exist inside bootstrapToken').toBeTruthy();

    saveRuntime();

    console.log('Refresh token generated successfully');
    return;
  }

  if (step.name === 'Refresh Token') {
    runtime.authToken =
      jsonData?.data?.accessToken ||
      jsonData?.accessToken ||
      jsonData?.token;

    expect(runtime.authToken, 'authToken should exist in Refresh Token response').toBeTruthy();

    saveRuntime();

    console.log('Auth token generated successfully');
    return;
  }

  if (step.name === 'GEO Token Refresh') {
    runtime.geoToken =
      jsonData?.data?.geoToken ||
      jsonData?.geoToken ||
      jsonData?.token;

    expect(runtime.geoToken, 'geoToken should exist in GEO Token response').toBeTruthy();

    saveRuntime();

    console.log('Geo token generated successfully');
    return;
  }

  if (step.name === 'New Work Order') {
    runtime.workOrderId =
      jsonData?.data?.swoId ||
      jsonData?.data?.workOrderId ||
      jsonData?.workOrderId ||
      jsonData?.id;

    expect(runtime.workOrderId, 'workOrderId should exist in New Work Order response').toBeTruthy();

    saveRuntime();

    console.log(`Work Order ID: ${runtime.workOrderId}`);
  }
}

export function expectedStatusesFor(step: PostmanStep): number[] {
  if (step.method === 'POST') {
    return [200, 201, 204];
  }

  if (step.method === 'PUT' || step.method === 'PATCH') {
    return [200, 201, 204];
  }

  if (step.method === 'DELETE') {
    return [200, 202, 204];
  }

  return [200];
}

export function validateResponse(
  step: PostmanStep,
  status: number,
  responseText: string,
  url: string
): void {
  const expectedStatuses = expectedStatusesFor(step);

  expect(
    expectedStatuses.includes(status),
    `
==================================================

API             : ${step.name}
Folder          : ${step.folderPath.join(' > ')}
Method          : ${step.method}
URL             : ${url}

Expected Status : ${expectedStatuses.join(', ')}
Actual Status   : ${status}

Response:
${responseText.substring(0, 1500)}

==================================================
`
  ).toBeTruthy();
}
