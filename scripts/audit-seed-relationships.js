import { supabaseAdmin } from '../apps/backend/src/supabaseClient.js';

async function fetchAll(table, columns) {
  const { data, error } = await supabaseAdmin.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

const [sales, products, profiles, roles, localMrs, assignments] = await Promise.all([
  fetchAll('sales', 'id, product_id, tot_id, local_mr_id, farmer_id'),
  fetchAll('products', 'id, name, description'),
  fetchAll('profiles', 'id, email, name'),
  fetchAll('user_roles', 'user_id, role'),
  fetchAll('local_mrs', 'id, name'),
  fetchAll('tot_assignments', 'tot_id, local_mr_id, status'),
]);

const productIds = new Set(products.map((product) => product.id));
const profileIds = new Set(profiles.map((profile) => profile.id));
const localMrIds = new Set(localMrs.map((mr) => mr.id));
const roleIds = new Set(roles.map((role) => role.user_id));

const missingProducts = sales.filter((sale) => !productIds.has(sale.product_id));
const missingTots = sales.filter((sale) => !profileIds.has(sale.tot_id));
const missingTotRoles = sales.filter((sale) => !roleIds.has(sale.tot_id));
const missingLocalMrs = sales.filter((sale) => !localMrIds.has(sale.local_mr_id));
const placeholderProducts = products.filter((product) => /^Imported product|^Unnamed product/.test(product.name || ''));

console.log(`sales: ${sales.length}`);
console.log(`products: ${products.length}`);
console.log(`profiles: ${profiles.length}`);
console.log(`roles: ${roles.length}`);
console.log(`local_mrs: ${localMrs.length}`);
console.log(`assignments: ${assignments.length}`);
console.log(`sales missing product rows: ${missingProducts.length}`);
console.log(`sales missing TOT profiles: ${missingTots.length}`);
console.log(`sales missing TOT roles: ${missingTotRoles.length}`);
console.log(`sales missing Local MR rows: ${missingLocalMrs.length}`);
console.log(`placeholder product names: ${placeholderProducts.length}`);

if (placeholderProducts.length > 0) {
  console.log('placeholder products:');
  placeholderProducts.forEach((product) => {
    console.log(`- ${product.id}: ${product.name}`);
  });
}

if (missingProducts.length || missingTots.length || missingTotRoles.length || missingLocalMrs.length) {
  process.exit(1);
}
