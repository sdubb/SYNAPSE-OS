import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schemas/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://synapse:synapse@localhost:5432/synapse_os",
  },
});
