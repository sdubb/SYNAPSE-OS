import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schemas/index.js";

const { Pool } = pg;

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | pg.ConnectionConfig["ssl"];
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export type SynapseDatabase = NodePgDatabase<typeof schema>;

export class DatabaseClient {
  private static instance: DatabaseClient | null = null;
  private pool: pg.Pool | null = null;
  private db: SynapseDatabase | null = null;
  private config: DatabaseConfig;
  private isConnecting = false;

  constructor(config?: DatabaseConfig) {
    this.config = config || {
      connectionString: process.env.DATABASE_URL || "postgres://synapse:synapse@127.0.0.1:5432/synapse_os",
      max: Number(process.env.DB_POOL_MAX) || 20,
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 5000,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    };
  }

  static getInstance(config?: DatabaseConfig): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient(config);
    }
    return DatabaseClient.instance;
  }

  /**
   * Connect to PostgreSQL pool and initialize Drizzle client.
   */
  async connect(): Promise<SynapseDatabase> {
    if (this.db && this.pool) {
      return this.db;
    }

    if (this.isConnecting) {
      // Wait if connection is in-flight
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (this.db) return this.db;
    }

    this.isConnecting = true;
    try {
      const connStr = process.env.DATABASE_URL || "postgres://synapse:synapse@127.0.0.1:5432/synapse_os";
      const pool = new Pool({
        ...this.config,
        connectionString: connStr,
        connectionTimeoutMillis: 5000,
      });

      pool.on("error", (err) => {
        console.error("[DatabaseClient] Unexpected client pool error:", err);
      });

      const client = await pool.connect();
      try {
        await client.query("SELECT 1 AS health_check");
      } finally {
        client.release();
      }

      this.pool = pool;
      this.db = drizzle(pool, { schema });
      return this.db;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Get existing Drizzle DB instance or throw error if not connected.
   */
  getDb(): SynapseDatabase {
    if (!this.db) {
      throw new Error("Database client is not connected. Call connect() first.");
    }
    return this.db;
  }

  /**
   * Get raw pg Pool instance.
   */
  getPool(): pg.Pool {
    if (!this.pool) {
      throw new Error("Database pool is not initialized. Call connect() first.");
    }
    return this.pool;
  }

  /**
   * Perform database ping / health check.
   */
  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      if (!this.pool) {
        await this.connect();
      }
      const client = await this.pool!.connect();
      try {
        await client.query("SELECT 1");
        return {
          ok: true,
          latencyMs: Date.now() - start,
        };
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: message,
      };
    }
  }

  /**
   * Graceful close connection pool.
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
    }
  }
}
