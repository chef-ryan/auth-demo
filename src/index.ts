import { bootstrapEnv } from "./utils/bootstrapEnv";
import { getNumberEnv } from "./utils/env";

await bootstrapEnv();

const { buildApp } = await import("./app");

const app = buildApp();
const port = getNumberEnv("PORT", 3000);

app.listen(port);

console.log(`L3 Auth demo server listening on http://localhost:${port}`);
