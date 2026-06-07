import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { StatementSync } from 'node:sqlite';
import { DatabaseSync } from 'node:sqlite';

import Postgrator from 'postgrator';

let instance: DB | undefined;
let initPromise: Promise<DB> | undefined;

/**
 * Return the process-wide database instance, opening and migrating it on first
 * use. Concurrent callers during initialization share the same promise.
 * @returns The initialized database wrapper.
 */
export function getDB(): Promise<DB> {
  if (instance?.db.isOpen) return Promise.resolve(instance);
  initPromise ??= initDB().then((db) => {
    instance = db;
    initPromise = undefined;
    return db;
  });
  return initPromise;
}

/**
 * Return a fresh in-memory database, migrated and ready. Useful for tests so
 * they never touch the on-disk cache.
 * @returns A temporary database wrapper.
 */
export async function getTempDB(): Promise<DB> {
  const db = new DatabaseSync(':memory:');
  await prepareDB(db);
  return new DB(db);
}

/**
 * Open the on-disk database (or an in-memory one under test), tune it for a
 * concurrent read-heavy workload and apply the migrations.
 * @returns The initialized database wrapper.
 */
async function initDB(): Promise<DB> {
  if (process.env.VITEST) return getTempDB();

  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // https://www.sqlite.org/wal.html — WAL lets many readers run while a single
  // writer refreshes a timetable, with a large speed-up over the default.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 30000');
  db.exec('PRAGMA synchronous = NORMAL');
  await prepareDB(db);
  return new DB(db);
}

/**
 * Bring the database schema up to date by running the Postgrator migrations.
 * @param db - The raw database connection to migrate.
 */
async function prepareDB(db: DatabaseSync): Promise<void> {
  const postgrator = new Postgrator({
    migrationPattern: join(import.meta.dirname, 'migrations/*'),
    driver: 'sqlite3',
    execQuery: (query) => Promise.resolve({ rows: db.prepare(query).all() }),
    execSqlScript: (sqlScript) => Promise.resolve(db.exec(sqlScript)),
  });
  await postgrator.migrate();
}

/**
 * Resolve the on-disk database path: the `CACHE_DB_PATH` env var, else
 * `data/sqlite/db.sqlite` in the mounted data directory.
 * @returns The SQLite file path.
 */
function resolveDbPath(): string {
  return (
    process.env.CACHE_DB_PATH ??
    join(import.meta.dirname, '../../../data/sqlite/db.sqlite')
  );
}

/** A cached query result row from {@link DB.selectDayTrains}. */
export interface DayTrainsRow {
  /** The cached trains, serialized as JSON. */
  trains: string;
  /** When the entry was stored, in ms since the epoch. */
  fetchedAt: number;
}

/**
 * Wrapper around the SQLite connection that owns every prepared statement,
 * caching each one on first access.
 */
export class DB {
  /** The raw database connection. */
  readonly db: DatabaseSync;
  readonly #statements = new Map<string, StatementSync>();

  /**
   * @param db - The raw database connection to wrap.
   */
  constructor(db: DatabaseSync) {
    this.db = db;
  }

  /**
   * Return a prepared statement, creating and caching it on first access.
   * @param sql - The SQL to prepare.
   * @returns The cached prepared statement.
   */
  statement(sql: string): StatementSync {
    let cached = this.#statements.get(sql);
    if (!cached) {
      cached = this.db.prepare(sql);
      this.#statements.set(sql, cached);
    }
    return cached;
  }

  /** Look up a cached whole-day timetable by origin, destination and date. */
  get selectDayTrains(): StatementSync {
    return this.statement(
      'SELECT trains, fetched_at AS fetchedAt FROM day_trains WHERE from_id = ? AND to_id = ? AND date = ?',
    );
  }

  /** Insert or replace a whole-day timetable. */
  get upsertDayTrains(): StatementSync {
    return this.statement(
      `INSERT INTO day_trains (from_id, to_id, date, trains, fetched_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(from_id, to_id, date)
       DO UPDATE SET trains = excluded.trains, fetched_at = excluded.fetched_at`,
    );
  }

  /** Close the connection and clear the statement cache. */
  close(): void {
    this.#statements.clear();
    this.db.close();
  }
}
