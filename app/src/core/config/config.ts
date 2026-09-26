declare const process: { env: Record<string, string | undefined> };

export interface AppConfig {
  appName: string;
  environment: string;
  apiBaseUrl: string;
}

export const config: AppConfig = {
  appName: process.env.REACT_APP_APP_NAME || 'КОНТУР',
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || '/api',
};
