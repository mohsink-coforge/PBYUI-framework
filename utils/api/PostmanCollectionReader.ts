import * as fs from 'fs';
import * as path from 'path';
import { PostmanStep } from './types';

export function readCollection(): any {
  const collectionPath = path.resolve(
    process.cwd(),
    'test-data/api/collections/Pepboys_AllEndpoints.postman_collection.json'
  );

  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Collection file not found: ${collectionPath}`);
  }

  return JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));
}

export function flattenCollectionItems(
  items: any[],
  folderPath: string[] = [],
  output: PostmanStep[] = []
): PostmanStep[] {
  for (const item of items) {
    if (item.item) {
      flattenCollectionItems(item.item, [...folderPath, item.name], output);
      continue;
    }

    const request = item.request;
    const headers: Record<string, string> = {};

    for (const header of request.header || []) {
      if (header.disabled) {
        continue;
      }

      if (!header.key) {
        continue;
      }

      headers[header.key] = header.value ?? '';
    }

    output.push({
      name: item.name,
      folderPath,
      method: request.method,
      rawUrl: request.url?.raw,
      headers,
      rawBody: request.body?.raw,
      auth: request.auth,
    });
  }

  return output;
}

export function loadPostmanSteps(): PostmanStep[] {
  const collection = readCollection();

  if (!collection?.item) {
    throw new Error('Invalid Postman collection format: missing item array');
  }

  return flattenCollectionItems(collection.item);
}
