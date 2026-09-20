declare const process: any;

const requiredEnv = (
  name: string,
  value: string | undefined
): string => {
  if (!value) {
    throw new Error(
      `Environment variable ${name} is not configured.`
    );
  }

  return value;
};

export const config = {
  appName:
    process.env.REACT_APP_APP_NAME || "Think-Fast",

  apiUrl: requiredEnv(
    "REACT_APP_API_URL",
    process.env.REACT_APP_API_URL
  ),

  authUrl: requiredEnv(
    "REACT_APP_AUTH_URL",
    process.env.REACT_APP_AUTH_URL
  ),
} as const;