import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

class MockPreparedStatement {
  private readonly db: DatabaseSync;
  private readonly sql: string;
  private readonly params: unknown[];

  constructor(db: DatabaseSync, sql: string, params: unknown[] = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...values: unknown[]): MockPreparedStatement {
    return new MockPreparedStatement(this.db, this.sql, values);
  }

  private normalizeParams(): (string | number | bigint | Uint8Array | null)[] {
    return this.params.map((v) => {
      if (v === undefined || v === null) return null;
      if (typeof v === "boolean") return v ? 1 : 0;
      return v as string | number | bigint | Uint8Array;
    });
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...this.normalizeParams()) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (colName) return (row[colName] as T) ?? null;
    return row as T;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean; meta: Record<string, unknown> }> {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.all(...this.normalizeParams()) as T[];
    return { results: rows, success: true, meta: {} };
  }

  async run(): Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }> {
    const stmt = this.db.prepare(this.sql);
    const info = stmt.run(...this.normalizeParams());
    return {
      success: true,
      meta: {
        changes: Number(info.changes ?? 0),
        last_row_id: Number(info.lastInsertRowid ?? 0),
      },
    };
  }
}

export class MockD1Database {
  public readonly sqlite: DatabaseSync;

  constructor() {
    this.sqlite = new DatabaseSync(":memory:");
  }

  prepare(sql: string): MockPreparedStatement {
    return new MockPreparedStatement(this.sqlite, sql);
  }

  async batch(statements: MockPreparedStatement[]) {
    const out = [];
    this.sqlite.exec("BEGIN");
    try {
      for (const s of statements) {
        const trimmed = (s as unknown as { sql: string }).sql.trim().toUpperCase();
        if (trimmed.startsWith("SELECT") || trimmed.startsWith("PRAGMA")) {
          out.push(await s.all());
        } else {
          out.push(await s.run());
        }
      }
      this.sqlite.exec("COMMIT");
      return out;
    } catch (err) {
      this.sqlite.exec("ROLLBACK");
      throw err;
    }
  }

  applyMigrations(migrationsDir: string): void {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      this.sqlite.exec(sql);
    }
  }
}
