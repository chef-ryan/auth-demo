import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const assignEnv = (key: string, value: string) => {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
};

const parseEnvFile = (content: string) => {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (!key) continue;

    let value = trimmed.slice(separator + 1).trim();
    if (!value) {
      assignEnv(key, "");
      continue;
    }

    const quote = value[0];
    if (
      (quote === `"` || quote === `'`) &&
      value[value.length - 1] === quote
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");
    assignEnv(key, value);
  }
};

export const bootstrapEnv = async (path = ".env") => {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return;
  }

  if (process.env.__ENV_BOOTSTRAPPED) {
    return;
  }

  process.env.__ENV_BOOTSTRAPPED = "true";

  try {
    const dotenv = await import("dotenv");
    if (typeof (dotenv as { config?: Function }).config === "function") {
      (dotenv as { config: (options?: { path?: string }) => void }).config({
        path,
      });
      return;
    }
  } catch {
    // Ignore missing dependency, fall back to manual parsing below.
  }

  if (typeof Bun !== "undefined" && Bun.env) {
    for (const [key, value] of Object.entries(Bun.env)) {
      assignEnv(key, String(value));
    }
    return;
  }

  const resolved = resolve(process.cwd(), path);
  if (!existsSync(resolved)) {
    return;
  }

  const content = readFileSync(resolved, "utf8");
  parseEnvFile(content);
};

