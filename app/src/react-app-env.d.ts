declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_API_URL: string;
    readonly REACT_APP_AUTH_URL: string;
    readonly REACT_APP_APP_NAME: string;
  }
}