import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../apps/backend/src/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultCsvDir = path.join(rootDir, 'data', 'imports', 'csv');

const FILE_TO_TABLE = {
  'local_mrs.csv': 'local_mrs',
  'machinery-export.csv': 'machinery',
  'products-export.csv': 'products',
  'profiles-export.csv': 'profiles',
  'sales-export.csv': 'sales',
  'tot_assignments.csv': 'tot_assignments',
  'user_roles.csv': 'user_roles',
};

const IMPORT_ORDER = [
  'local_mrs',
  'machinery',
  'profiles',
  'user_roles',
  'tot_assignments',
  'products',
  'sales',
];

function usage() {
  console.log(`
Usage: node ./scripts/import-csv.js [options]

Options:
  --csv-dir <dir>      Directory containing input CSV files (default: ./data/imports/csv)
  --file <name>        Import a single file by name or full path
  --table <table>      Force a target table for a single file import
  --auth-password <pw> Password to set when creating missing auth users
  --reset-auth-password
                       Also reset passwords for existing auth users in profiles CSV
  --dry-run            Parse files and report row counts without inserting
  --help               Show this help message

Supported file names:
  ${Object.keys(FILE_TO_TABLE).join('\n  ')}
`);
}

function parseArgs(argv) {
  const options = {
    csvDir: null,
    file: null,
    table: null,
    authPassword: process.env.CSV_SEED_USER_PASSWORD || null,
    resetAuthPassword: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--csv-dir' || arg === '--dir') {
      options.csvDir = argv[++i];
    } else if (arg === '--file') {
      options.file = argv[++i];
    } else if (arg === '--table') {
      options.table = argv[++i];
    } else if (arg === '--auth-password') {
      options.authPassword = argv[++i];
    } else if (arg === '--reset-auth-password') {
      options.resetAuthPassword = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else {
      console.error(`Unknown option: ${arg}`);
      usage();
      process.exit(1);
    }
  }

  return options;
}

function normalizeHeader(header) {
  return header
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

function coerceValue(key, value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  if (text === '') {
    return null;
  }

  const boolMap = {
    true: true,
    false: false,
    yes: true,
    no: false,
    y: true,
    n: false,
  };

  const lower = text.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(boolMap, lower)) {
    return boolMap[lower];
  }

  if (/^(null|undefined|none)$/i.test(text)) {
    return null;
  }

  if (/^\[.*\]$/.test(text) || /^\{.*\}$/.test(text)) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  const numericKeys = [
    'amount',
    'price',
    'commission',
    'rate',
    'quantity',
    'count',
    'total',
    'salary',
    'hours',
    'size',
    'stock',
    'revenue',
    'unit_price',
    'daily_rate',
    'hourly_rate',
    'farm_size',
  ];

  const isNumericField = numericKeys.some((pattern) => key.includes(pattern));
  const numericValue = /^-?\d+(?:\.\d+)?$/.test(text);
  if (isNumericField && numericValue) {
    return Number(text);
  }

  if (key.endsWith('_id') || key.endsWith('_by') || key === 'id' || key === 'phone') {
    return text;
  }

  if (numericValue) {
    return Number(text);
  }

  return text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  const normalized = text.replace(/^\uFEFF/, '');
  const firstLine = normalized.split(/\r?\n/, 1)[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      row.push(value);
      value = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (inQuotes) {
    throw new Error('Malformed CSV: missing closing quote.');
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function getSeedPassword(options) {
  return options.authPassword || crypto.randomBytes(18).toString('base64url');
}

async function collectCsvFiles(dir) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const item of items) {
    const resolved = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await collectCsvFiles(resolved));
    } else if (item.isFile()) {
      const fileName = item.name.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(FILE_TO_TABLE, fileName)) {
        files.push(resolved);
      }
    }
  }

  return files;
}

function sortCsvFiles(filePaths) {
  return filePaths.sort((left, right) => {
    const leftTable = FILE_TO_TABLE[path.basename(left).toLowerCase()];
    const rightTable = FILE_TO_TABLE[path.basename(right).toLowerCase()];
    const leftIndex = IMPORT_ORDER.indexOf(leftTable);
    const rightIndex = IMPORT_ORDER.indexOf(rightTable);
    const normalizedLeft = leftIndex === -1 ? IMPORT_ORDER.length : leftIndex;
    const normalizedRight = rightIndex === -1 ? IMPORT_ORDER.length : rightIndex;
    return normalizedLeft - normalizedRight || left.localeCompare(right);
  });
}

const TABLE_COLUMNS = {
  local_mrs: [
    'id', 'name', 'region', 'county', 'sub_county', 'ward',
    'contact_phone', 'contact_email', 'coordinator_id', 'status',
    'created_at', 'updated_at',
  ],
  machinery: [
    'id', 'name', 'category', 'model', 'registration_number',
    'local_mr_id', 'hourly_rate', 'daily_rate', 'status', 'condition',
    'last_service_date', 'next_service_date', 'created_at', 'updated_at',
  ],
  products: [
    'id', 'name', 'category', 'unit', 'unit_price', 'commission_per_unit',
    'stock_quantity', 'min_stock_level', 'description', 'status',
    'created_at', 'updated_at', 'buying_price', 'selling_price',
  ],
  profiles: [
    'id', 'name', 'email', 'phone', 'avatar_url', 'status',
    'created_at', 'updated_at',
  ],
  sales: [
    'id', 'farmer_id', 'product_id', 'tot_id', 'local_mr_id',
    'quantity', 'unit_price', 'total_amount', 'commission_per_unit',
    'commission_amount', 'commission_paid', 'commission_paid_at',
    'payment_method', 'payment_status', 'notes', 'sale_date',
    'created_at', 'updated_at',
  ],
  tot_assignments: [
    'id', 'tot_id', 'local_mr_id', 'assigned_at', 'status',
  ],
  user_roles: [
    'id', 'user_id', 'role', 'created_at',
  ],
};

function getTableColumns(tableName) {
  const columns = TABLE_COLUMNS[tableName];
  if (!columns) {
    throw new Error(`No supported column list configured for table ${tableName}.`);
  }
  return columns;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function deriveProductsFromSales(records) {
  const products = new Map();

  for (const record of records) {
    if (!record.product_id) {
      continue;
    }

    if (products.has(record.product_id)) {
      const product = products.get(record.product_id);
      product.stock_quantity += Math.ceil(toNumber(record.quantity));
      continue;
    }

    const sellingPrice = toNumber(record.unit_price);
    const commissionPerUnit = toNumber(record.commission_per_unit);
    const buyingPrice = Math.max(sellingPrice - commissionPerUnit / 0.4, 0);

    products.set(record.product_id, {
      id: record.product_id,
      name: `Unnamed product ${sellingPrice || record.product_id}`,
      category: 'seeded',
      unit: 'unit',
      unit_price: sellingPrice,
      selling_price: sellingPrice,
      buying_price: Number(buyingPrice.toFixed(2)),
      commission_per_unit: commissionPerUnit,
      stock_quantity: Math.ceil(toNumber(record.quantity)),
      min_stock_level: 0,
      description: 'Derived from sales CSV seed data. Add products-export.csv to provide the real product name.',
      status: 'active',
    });
  }

  return Array.from(products.values());
}

async function ensureAuthUsersForProfiles(records, options) {
  const missingRequiredFields = records.filter((record) => !record.id || !record.email);
  if (missingRequiredFields.length > 0) {
    throw new Error(`Cannot create auth users: ${missingRequiredFields.length} profile rows are missing id or email.`);
  }

  if (options.dryRun) {
    console.log(`  Dry run: would ensure ${records.length} auth users exist for profiles.`);
    return;
  }

  const password = getSeedPassword(options);
  let createdCount = 0;
  let existingCount = 0;
  let resetCount = 0;

  for (const record of records) {
    const { data: existing, error: getError } = await supabaseAdmin.auth.admin.getUserById(record.id);

    if (existing?.user) {
      existingCount += 1;
      if (options.resetAuthPassword) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(record.id, {
          password,
          email_confirm: true,
          user_metadata: {
            name: record.name,
            phone: record.phone,
          },
        });

        if (updateError) {
          throw new Error(`Could not reset auth user ${record.email} (${record.id}): ${updateError.message}`);
        }

        resetCount += 1;
      }
      continue;
    }

    const notFound = getError && (getError.status === 404 || /not found/i.test(getError.message || ''));
    if (getError && !notFound) {
      throw new Error(`Could not check auth user ${record.id}: ${getError.message}`);
    }

    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      id: record.id,
      email: record.email,
      password,
      email_confirm: true,
      user_metadata: {
        name: record.name,
        phone: record.phone,
      },
    });

    if (createError) {
      throw new Error(`Could not create auth user ${record.email} (${record.id}): ${createError.message}`);
    }

    createdCount += 1;
  }

  const resetSummary = options.resetAuthPassword ? `, ${resetCount} password reset` : '';
  console.log(`  Auth users ready: ${existingCount} existing, ${createdCount} created${resetSummary}.`);
  if (createdCount > 0 && !options.authPassword) {
    console.log('  Created auth users with generated passwords. Use password reset or --auth-password for known seed credentials.');
  }
}

async function ensureProductsForSales(records, options) {
  const derivedProducts = deriveProductsFromSales(records);
  if (derivedProducts.length === 0) {
    throw new Error('Cannot import sales: no product_id values were found.');
  }

  if (options.dryRun) {
    console.log(`  Dry run: would ensure ${derivedProducts.length} products exist for sales.`);
    return;
  }

  const productIds = derivedProducts.map((product) => product.id);
  const { data: existingProducts, error: selectError } = await supabaseAdmin
    .from('products')
    .select('id, description')
    .in('id', productIds);

  if (selectError) {
    throw new Error(`Could not check products for sales import: ${selectError.message}`);
  }

  const existingById = new Map((existingProducts || []).map((product) => [product.id, product]));
  const productsToUpsert = derivedProducts.filter((product) => {
    const existingProduct = existingById.get(product.id);
    return !existingProduct || String(existingProduct.description || '').startsWith('Derived from sales CSV seed data');
  });

  if (productsToUpsert.length === 0) {
    console.log(`  Products ready: ${existingById.size} existing, 0 created or repaired.`);
    return;
  }

  const { error: upsertError } = await supabaseAdmin
    .from('products')
    .upsert(productsToUpsert, { onConflict: 'id', returning: 'minimal' });

  if (upsertError) {
    throw new Error(`Could not create derived products for sales import: ${upsertError.message}`);
  }

  console.log(`  Products ready: ${existingById.size} existing, ${productsToUpsert.length} created or repaired from sales data.`);
}

async function importCsvFile(filePath, tableName, options) {
  console.log(`\nImporting ${path.basename(filePath)} -> ${tableName}`);
  const raw = await fs.readFile(filePath, 'utf8');
  const rows = parseCsv(raw);

  if (rows.length < 2) {
    console.warn(`  Skipping ${path.basename(filePath)}: no data rows found.`);
    return;
  }

  const headers = rows[0].map(normalizeHeader);
  const dataRows = rows.slice(1);
  const allowedColumns = await getTableColumns(tableName);
  const records = dataRows.map((row, rowIndex) => {
    const record = {};
    headers.forEach((header, index) => {
      const rawValue = row[index] ?? '';
      const value = coerceValue(header, rawValue);
      if (value !== null || allowedColumns.includes(header)) {
        if (allowedColumns.includes(header)) {
          record[header] = value;
        }
      }
    });

    const keys = Object.keys(record);
    if (keys.length === 0) {
      throw new Error(`Row ${rowIndex + 2} in ${path.basename(filePath)} contains no valid insertable columns.`);
    }

    return record;
  });

  if (options.dryRun) {
    console.log(`  Dry run: ${records.length} rows parsed.`);
    console.log(`  Sample record: ${JSON.stringify(records[0], null, 2)}`);
    if (tableName === 'profiles') {
      await ensureAuthUsersForProfiles(records, options);
    } else if (tableName === 'sales') {
      await ensureProductsForSales(records, options);
    }
    return;
  }

  if (tableName === 'profiles') {
    await ensureAuthUsersForProfiles(records, options);
  } else if (tableName === 'sales') {
    await ensureProductsForSales(records, options);
  }

  const chunkSize = 200;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin
      .from(tableName)
      .upsert(chunk, { onConflict: 'id', returning: 'minimal' });

    if (error) {
      throw new Error(`Import failed for ${tableName} at rows ${i + 1}-${i + chunk.length}: ${error.message}`);
    }

    console.log(`  Upserted ${chunk.length} rows (${i + 1}-${i + chunk.length}).`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const csvDir = path.resolve(rootDir, options.csvDir || defaultCsvDir);

  let filePaths = [];
  if (options.file) {
    const suppliedPath = path.isAbsolute(options.file)
      ? options.file
      : path.resolve(csvDir, options.file);

    filePaths = [suppliedPath];
  } else {
    try {
      filePaths = await collectCsvFiles(csvDir);
    } catch (error) {
      console.error(`Failed to read CSV directory ${csvDir}: ${error.message}`);
      process.exit(1);
    }
  }

  if (filePaths.length === 0) {
    console.warn(`No CSV files found in ${csvDir}.`);
    process.exit(0);
  }

  sortCsvFiles(filePaths);

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath).toLowerCase();
    const tableName = options.table || FILE_TO_TABLE[fileName];
    if (!tableName) {
      console.warn(`Skipping unsupported file: ${fileName}`);
      continue;
    }

    try {
      await importCsvFile(filePath, tableName, options);
    } catch (error) {
      console.error(`Error importing ${filePath}: ${error.message}`);
      process.exit(1);
    }
  }

  console.log('\nImport complete.');
}

main().catch((error) => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
