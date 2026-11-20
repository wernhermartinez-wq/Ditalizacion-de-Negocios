// Copia de seguridad lógica de los datos de Supabase (solo lectura).
// Guarda cada tabla de `public` y los usuarios de Auth como JSON en
// copias-seguridad/<fecha>_<hora>/. La carpeta está en .gitignore porque
// contiene datos personales: no la subas ni la compartas.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secretKey) {
  throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY antes de la copia.");
}

const supabase = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Tablas: las que lee el código y las que crean las migraciones.
const tables = new Set();
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
      for (const match of readFileSync(path, "utf8").matchAll(/\.from\("([a-z_]+)"\)/g)) tables.add(match[1]);
    }
  }
})("src");
for (const name of readdirSync("supabase/migrations")) {
  for (const match of readFileSync(join("supabase/migrations", name), "utf8").matchAll(/^create table (?:if not exists )?public\.([a-z_]+)/gim)) {
    tables.add(match[1]);
  }
}

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const outDir = join("copias-seguridad", stamp);
mkdirSync(outDir, { recursive: true });

const PAGE = 1000;
const manifest = { creada: now.toISOString(), proyecto: new URL(url).hostname, tablas: {}, omitidas: {} };

async function readAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select("*").range(from, from + PAGE - 1);
    let result = await query.order("id", { ascending: true });
    if (result.error) result = await supabase.from(table).select("*").range(from, from + PAGE - 1);
    if (result.error) return { error: result.error.message };
    rows.push(...result.data);
    if (result.data.length < PAGE) return { rows };
  }
}

for (const table of [...tables].sort()) {
  const result = await readAll(table);
  if (result.error) {
    manifest.omitidas[table] = result.error.slice(0, 120);
    continue;
  }
  writeFileSync(join(outDir, `${table}.json`), JSON.stringify(result.rows, null, 1));
  manifest.tablas[table] = result.rows.length;
}

// Usuarios de Auth (sin contraseñas: la API no las expone).
const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) {
    manifest.omitidas.auth_users = error.message.slice(0, 120);
    break;
  }
  users.push(...data.users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    email_confirmed_at: user.email_confirmed_at,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  })));
  if (data.users.length < 1000) break;
}
if (!manifest.omitidas.auth_users) {
  writeFileSync(join(outDir, "auth_users.json"), JSON.stringify(users, null, 1));
  manifest.tablas.auth_users = users.length;
}

writeFileSync(join(outDir, "_resumen.json"), JSON.stringify(manifest, null, 1));
const total = Object.values(manifest.tablas).reduce((sum, count) => sum + count, 0);
console.info(`Copia creada en ${outDir}: ${Object.keys(manifest.tablas).length} tablas, ${total} filas.`);
if (Object.keys(manifest.omitidas).length) console.warn("Omitidas:", manifest.omitidas);
