export type RuntimeVariables = {
  authCode?: string;
  refreshToken?: string;
  authToken?: string;
  geoToken?: string;
  workOrderId?: string;
};

export type PostmanStep = {
  name: string;
  folderPath: string[];
  method: string;
  rawUrl: string;
  headers: Record<string, string>;
  rawBody?: string;
  auth?: any;
};
