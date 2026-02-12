/**
 * sync-prod-to-dev.mjs
 *
 * Copies data from the production Neon PostgreSQL database to the dev
 * Neon PostgreSQL database. Copies users, stations, and all content tables.
 *
 * Prerequisites:
 *   npm install pg
 *
 * Usage:
 *   node scripts/sync-prod-to-dev.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_q7N1owMIiWnp@ep-lingering-sun-abx8zkr7-pooler.eu-west-2.aws.neon.tech/newskoopdb?sslmode=require';

function getDevDatabaseUrl() {
  const envPath = resolve(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const match = envContent.match(/^DATABASE_URL=(.+)$/m);
  if (!match) {
    throw new Error('DATABASE_URL not found in .env file');
  }
  return match[1].trim();
}

const DEV_DATABASE_URL = getDevDatabaseUrl();

if (DEV_DATABASE_URL === PROD_DATABASE_URL) {
  console.error('ERROR: Dev and production database URLs are identical. Aborting.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tables to copy, in phases (respecting FK order)
// ---------------------------------------------------------------------------

// Phase 0: Users and Stations (everything else depends on these)
const PHASE_0_TABLES = [
  'User',
  'Station',
];

// Phase 1: Reference tables
const PHASE_1_TABLES = [
  'Category',
  'Tag',
  'Classification',
  'StoryGroup',
  'StationClassification',
  'BulletinSchedule',
];

// Phase 2: Main content tables
const PHASE_2_TABLES = [
  'Story',
  'Bulletin',
  'Show',
  'Episode',
];

// Phase 3: Junction / child tables
const PHASE_3_TABLES = [
  'StoryTag',
  'StoryClassification',
  'AudioClip',
  'Comment',
  'RevisionRequest',
  'BulletinStory',
  'ShowTag',
  'ShowClassification',
];

// All tables in child-first order for clearing
const TABLES_TO_CLEAR = [
  ...PHASE_3_TABLES,
  ...PHASE_2_TABLES,
  ...PHASE_1_TABLES,
  ...PHASE_0_TABLES,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPool(url, label) {
  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => {
    console.error(`[${label}] Unexpected pool error:`, err.message);
  });
  return pool;
}

function q(name) {
  return `"${name}"`;
}

/**
 * Get all column names for a table.
 */
async function getColumns(pool, tableName) {
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );
  return result.rows.map((r) => r.column_name);
}

/**
 * Get columns that exist in BOTH source and target tables.
 * This prevents errors when prod has columns that dev doesn't (e.g., removed columns).
 */
async function getCommonColumns(prodPool, devPool, tableName) {
  const prodCols = await getColumns(prodPool, tableName);
  const devCols = await getColumns(devPool, tableName);

  if (prodCols.length === 0) return { found: false, columns: [] };
  if (devCols.length === 0) return { found: false, columns: [] };

  const devColSet = new Set(devCols);
  const common = prodCols.filter((c) => devColSet.has(c));

  const dropped = prodCols.filter((c) => !devColSet.has(c));
  if (dropped.length > 0) {
    console.log(`  NOTE: ${tableName} - skipping columns not in dev: ${dropped.join(', ')}`);
  }

  return { found: true, columns: common };
}

/**
 * Fetch all rows from a table (only specified columns).
 */
async function fetchAll(pool, tableName, columns) {
  const colList = columns.map((c) => q(c)).join(', ');
  const result = await pool.query(`SELECT ${colList} FROM ${q(tableName)}`);
  return result.rows;
}

/**
 * Insert rows into a table in batches. Returns count of rows inserted.
 */
async function insertRows(pool, tableName, columns, rows) {
  if (rows.length === 0) return 0;

  const BATCH_SIZE = 500;
  let insertedCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const colList = columns.map((c) => q(c)).join(', ');

    const valueClauses = [];
    const params = [];
    let paramIdx = 1;

    for (const row of batch) {
      const placeholders = columns.map(() => `$${paramIdx++}`);
      valueClauses.push(`(${placeholders.join(', ')})`);
      for (const col of columns) {
        params.push(row[col] !== undefined ? row[col] : null);
      }
    }

    const sql = `INSERT INTO ${q(tableName)} (${colList}) VALUES ${valueClauses.join(', ')} ON CONFLICT DO NOTHING`;

    try {
      const result = await pool.query(sql, params);
      insertedCount += result.rowCount;
    } catch (err) {
      console.error(`  ERROR inserting batch into ${tableName}:`, err.message);
      // Row-by-row fallback
      for (const row of batch) {
        try {
          const singlePlaceholders = columns.map((_, idx) => `$${idx + 1}`);
          const singleParams = columns.map((col) =>
            row[col] !== undefined ? row[col] : null
          );
          const singleSql = `INSERT INTO ${q(tableName)} (${colList}) VALUES (${singlePlaceholders.join(', ')}) ON CONFLICT DO NOTHING`;
          const singleResult = await pool.query(singleSql, singleParams);
          insertedCount += singleResult.rowCount;
        } catch (singleErr) {
          console.error(
            `  SKIPPED row in ${tableName} (id=${row.id || row.storyId || 'N/A'}): ${singleErr.message}`
          );
        }
      }
    }
  }

  return insertedCount;
}

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

async function main() {
  console.log('==========================================================');
  console.log('  Newskoop: Production -> Dev Database Sync');
  console.log('==========================================================\n');

  console.log(`Production DB: ${PROD_DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`Dev DB:        ${DEV_DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  console.log('');

  const prodPool = createPool(PROD_DATABASE_URL, 'PROD');
  const devPool = createPool(DEV_DATABASE_URL, 'DEV');

  try {
    console.log('Testing database connections...');
    await prodPool.query('SELECT 1');
    console.log('  Production: Connected');
    await devPool.query('SELECT 1');
    console.log('  Dev:        Connected\n');

    const stats = {};

    // ------------------------------------------------------------------
    // Clear dev tables (child-first order)
    // ------------------------------------------------------------------
    console.log('----------------------------------------------------------');
    console.log('  Phase: Clearing dev tables');
    console.log('----------------------------------------------------------');

    for (const table of TABLES_TO_CLEAR) {
      try {
        const result = await devPool.query(`DELETE FROM ${q(table)}`);
        console.log(`  Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (err) {
        console.warn(`  WARN: Could not clear ${table}: ${err.message}`);
      }
    }
    console.log('');

    // ------------------------------------------------------------------
    // Helper: copy a single table with self-referencing support
    // ------------------------------------------------------------------
    async function copyTable(tableName) {
      const { found, columns } = await getCommonColumns(prodPool, devPool, tableName);
      if (!found) {
        console.log(`  SKIP ${tableName}: table not found`);
        stats[tableName] = { prod: 0, dev: 0, skipped: 0 };
        return;
      }

      let rows = await fetchAll(prodPool, tableName, columns);
      const prodCount = rows.length;
      let skippedCount = 0;

      // Self-referencing tables: insert parents first, then children
      if (tableName === 'Category') {
        const parents = rows.filter((r) => r.parentId === null);
        const children = rows.filter((r) => r.parentId !== null);
        const p = await insertRows(devPool, tableName, columns, parents);
        const c = await insertRows(devPool, tableName, columns, children);
        stats[tableName] = { prod: prodCount, dev: p + c, skipped: 0 };
        console.log(`  ${tableName}: ${prodCount} in prod -> ${p + c} copied`);
        return;
      }

      if (tableName === 'Story') {
        const originals = rows.filter((r) => r.originalStoryId === null);
        const translations = rows.filter((r) => r.originalStoryId !== null);
        const o = await insertRows(devPool, tableName, columns, originals);
        const t = await insertRows(devPool, tableName, columns, translations);
        stats[tableName] = { prod: prodCount, dev: o + t, skipped: 0 };
        console.log(`  ${tableName}: ${prodCount} in prod -> ${o + t} copied`);
        return;
      }

      if (tableName === 'Comment') {
        const roots = rows.filter((r) => r.parentId === null);
        const replies = rows.filter((r) => r.parentId !== null);
        const ro = await insertRows(devPool, tableName, columns, roots);
        const re = await insertRows(devPool, tableName, columns, replies);
        stats[tableName] = { prod: prodCount, dev: ro + re, skipped: 0 };
        console.log(`  ${tableName}: ${prodCount} in prod -> ${ro + re} copied`);
        return;
      }

      const inserted = await insertRows(devPool, tableName, columns, rows);
      stats[tableName] = { prod: prodCount, dev: inserted, skipped: skippedCount };
      console.log(`  ${tableName}: ${prodCount} in prod -> ${inserted} copied`);
    }

    // ------------------------------------------------------------------
    // Phase 0: Users and Stations
    // ------------------------------------------------------------------
    console.log('----------------------------------------------------------');
    console.log('  Phase 0: Users and Stations');
    console.log('----------------------------------------------------------');
    for (const table of PHASE_0_TABLES) {
      await copyTable(table);
    }
    console.log('');

    // ------------------------------------------------------------------
    // Phase 1: Reference tables
    // ------------------------------------------------------------------
    console.log('----------------------------------------------------------');
    console.log('  Phase 1: Reference tables');
    console.log('----------------------------------------------------------');
    for (const table of PHASE_1_TABLES) {
      await copyTable(table);
    }
    console.log('');

    // ------------------------------------------------------------------
    // Phase 2: Content tables
    // ------------------------------------------------------------------
    console.log('----------------------------------------------------------');
    console.log('  Phase 2: Content tables');
    console.log('----------------------------------------------------------');
    for (const table of PHASE_2_TABLES) {
      await copyTable(table);
    }
    console.log('');

    // ------------------------------------------------------------------
    // Phase 3: Junction / child tables
    // ------------------------------------------------------------------
    console.log('----------------------------------------------------------');
    console.log('  Phase 3: Junction & child tables');
    console.log('----------------------------------------------------------');
    for (const table of PHASE_3_TABLES) {
      await copyTable(table);
    }

    // ------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------
    console.log('');
    console.log('==========================================================');
    console.log('  Sync Summary');
    console.log('==========================================================');
    console.log('');
    console.log(
      `  ${'Table'.padEnd(25)} ${'Prod'.padStart(8)} ${'Copied'.padStart(8)}`
    );
    console.log('  ' + '-'.repeat(43));

    let totalProd = 0;
    let totalCopied = 0;

    const allTables = [...PHASE_0_TABLES, ...PHASE_1_TABLES, ...PHASE_2_TABLES, ...PHASE_3_TABLES];
    for (const table of allTables) {
      const s = stats[table] || { prod: 0, dev: 0 };
      totalProd += s.prod;
      totalCopied += s.dev;
      console.log(
        `  ${table.padEnd(25)} ${String(s.prod).padStart(8)} ${String(s.dev).padStart(8)}`
      );
    }

    console.log('  ' + '-'.repeat(43));
    console.log(
      `  ${'TOTAL'.padEnd(25)} ${String(totalProd).padStart(8)} ${String(totalCopied).padStart(8)}`
    );
    console.log('');
    console.log('Sync complete!');

  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  } finally {
    await prodPool.end();
    await devPool.end();
  }
}

main();
