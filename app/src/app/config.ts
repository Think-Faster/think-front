declare const process: any;

export interface AppConfig {
  appName: string;
  environment: string;
  apiBaseUrl: string;
  authApiUrl: string;
}

const config: AppConfig = {
  appName:
    process.env.REACT_APP_APP_NAME || 'КОНТУР',

  environment:
    process.env.REACT_APP_ENVIRONMENT || 'development',

  apiBaseUrl:
    process.env.REACT_APP_API_BASE_URL || '/api',

  authApiUrl:
    process.env.REACT_APP_AUTH_API_URL || '/api/auth',
};

export default config;