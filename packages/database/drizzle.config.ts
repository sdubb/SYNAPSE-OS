import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schemas/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? (() => { throw new Error('DATABASE_URL is required. No default database URL is permitted.'); })(),
  },
});
