const throwMissingEnv = (key: string): never => {
  throw new Error(`${key} environment variable is required`);
};

export const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value !== undefined && value !== "") {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  return throwMissingEnv(key);
};

export const getNumberEnv = (key: string, fallback?: number): number => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) {
      return fallback;
    }
    return throwMissingEnv(key);
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} environment variable must be a number`);
  }

  return parsed;
};

export const getBooleanEnv = (key: string, fallback?: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) {
      return fallback;
    }
    return throwMissingEnv(key);
  }

  if (/^(true|1)$/i.test(value)) return true;
  if (/^(false|0)$/i.test(value)) return false;
  throw new Error(`${key} environment variable must be a boolean`);
};
