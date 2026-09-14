/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PHOTOS: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth/login" && request.method === "POST") return login(request, env);
    if (url.pathname === "/api/auth/signup" && request.method === "POST") return signup(request, env);
    if (url.pathname === "/api/auth/logout" && request.method === "POST") return logout(request);
    if (url.pathname === "/api/auth/me" && request.method === "GET") return me(request, env);
    if (url.pathname === "/api/auth/users" && request.method === "GET") return listUsers(request, env);
    if (url.pathname.startsWith("/api/auth/users/") && request.method === "PUT") return updateUser(request, url.pathname.slice("/api/auth/users/".length), env);

    if (url.pathname === "/order-legacy.html" || url.pathname === "/order-admin-legacy.html") {
      if (!(await currentUser(request, env))) return Response.redirect(new URL("/", request.url), 302);
    }
    if (url.pathname.startsWith("/api/") && !(await currentUser(request, env))) return Response.json({ error: "請先登入" }, { status: 401 });

    if (url.pathname === "/api/service-photos" && request.method === "GET") {
      return listServicePhotos(url, env);
    }
    if (url.pathname === "/api/service-photos" && request.method === "POST") {
      return saveServicePhoto(request, url, env);
    }
    if (url.pathname.startsWith("/api/service-photo/") && request.method === "GET") {
      return readServicePhoto(url.pathname.slice("/api/service-photo/".length), env);
    }
    if (url.pathname.startsWith("/api/service-photo/") && request.method === "DELETE") {
      return deleteServicePhoto(request, url.pathname.slice("/api/service-photo/".length), env);
    }
    if (url.pathname === "/api/customer-records" && request.method === "GET") {
      return listCustomerRecords(request, url, env);
    }
    if (url.pathname === "/api/customer-records" && request.method === "POST") {
      return saveCustomerRecord(request, env);
    }
    if (url.pathname.startsWith("/api/customer-record/") && request.method === "PUT") {
      return updateCustomerRecord(request, url.pathname.slice("/api/customer-record/".length), env);
    }
    if (url.pathname.startsWith("/api/customer-record/") && request.method === "PATCH") {
      return reviewCustomerRecord(request, url.pathname.slice("/api/customer-record/".length), env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

const photoTableSql = `CREATE TABLE IF NOT EXISTS service_photos (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  service_date TEXT NOT NULL,
  photo_kind TEXT NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(customer_name, service_date, photo_kind)
)`;

async function ensurePhotoTable(env: Env) {
  await env.DB.prepare(photoTableSql).run();
}

const ADMIN_HASH = "b4a706b935a49a7b37abc732e9dff55ab50a35ebb8d60e4aa5adf8ec0243a7df";
const LEGACY_HASH = "e95714cfb71ea096a4b8e425c846dcd2639bd52313c87a5a82ce53d78c66c489";
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((x) => x.toString(16).padStart(2, "0")).join("");
const readCookie = (request: Request, key: string) => request.headers.get("cookie")?.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${key}=`))?.slice(key.length + 1) || "";
type User = { id: string; username: string; role: string; status: string };
async function currentUser(request: Request, env: Env): Promise<User | null> {
  const token = readCookie(request, "wd_session"); if (!token) return null;
  return env.DB.prepare("SELECT u.id, u.username, u.role, u.status FROM wd_sessions s JOIN wd_users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ? AND u.status = 'approved'").bind(token, new Date().toISOString()).first<User>();
}
async function authInput(request: Request) { const body = await request.json() as { username?: string; password?: string }; return { username: (body.username || "").trim(), password: body.password || "" }; }
async function login(request: Request, env: Env) {
  const { username, password } = await authInput(request); if (!username || !password) return Response.json({ error: "請輸入帳號與密碼" }, { status: 400 });
  const row = await env.DB.prepare("SELECT id, username, password_hash AS passwordHash, role, status FROM wd_users WHERE username = ?").bind(username).first<{ id: string; username: string; passwordHash: string; role: string; status: string }>();
  const supplied = await hash(row?.role === "admin" ? `admin|${username}|${password}` : `legacy|${password}`);
  if (!row && username !== "Wesley" && supplied === LEGACY_HASH) {
    const now = new Date().toISOString(); const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO wd_users (id, username, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, 'designer', 'approved', ?, ?)").bind(id, username, LEGACY_HASH, now, now).run();
    return createSession(id, username, "designer", env);
  }
  if (!row || row.status !== "approved" || supplied !== row.passwordHash) return Response.json({ error: row?.status === "pending" ? "帳號尚待 Wesley 核准" : "帳號或密碼不正確" }, { status: 401 });
  return createSession(row.id, row.username, row.role, env);
}
async function createSession(id: string, username: string, role: string, env: Env) {
  const token = crypto.randomUUID().replaceAll("-", ""); await env.DB.prepare("INSERT INTO wd_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(token, id, new Date(Date.now() + 30 * 86400000).toISOString(), new Date().toISOString()).run();
  return new Response(JSON.stringify({ ok: true, username, role }), { headers: { "content-type": "application/json", "set-cookie": `wd_session=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax` } });
}
async function signup(request: Request, env: Env) { const { username, password } = await authInput(request); if (!username || password.length < 6) return Response.json({ error: "帳號不可空白，密碼至少 6 碼" }, { status: 400 }); const now = new Date().toISOString(); try { await env.DB.prepare("INSERT INTO wd_users (id, username, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, 'designer', 'pending', ?, ?)").bind(crypto.randomUUID(), username, await hash(`signup|${username}|${password}`), now, now).run(); return Response.json({ ok: true }); } catch { return Response.json({ error: "此帳號已申請過" }, { status: 409 }); } }
async function logout(request: Request) { return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": "wd_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax" } }); }
async function me(request: Request, env: Env) { const user = await currentUser(request, env); return user ? Response.json({ user }) : Response.json({ user: null }, { status: 401 }); }
async function adminUser(request: Request, env: Env) { const user = await currentUser(request, env); return user?.role === "admin" ? user : null; }
async function listUsers(request: Request, env: Env) { if (!await adminUser(request, env)) return Response.json({ error: "需要管理員權限" }, { status: 403 }); const rows = await env.DB.prepare("SELECT id, username, role, status, created_at AS createdAt FROM wd_users ORDER BY created_at DESC").all(); return Response.json({ users: rows.results }); }
async function updateUser(request: Request, id: string, env: Env) { if (!await adminUser(request, env)) return Response.json({ error: "需要管理員權限" }, { status: 403 }); const body = await request.json() as { status?: string }; if (!["approved", "disabled", "pending"].includes(body.status || "")) return Response.json({ error: "狀態不正確" }, { status: 400 }); await env.DB.prepare("UPDATE wd_users SET status = ?, updated_at = ? WHERE id = ?").bind(body.status, new Date().toISOString(), id).run(); return Response.json({ ok: true }); }

function photoIdentity(url: URL) {
  return {
    customer: (url.searchParams.get("customer") || "").trim(),
    date: (url.searchParams.get("date") || "").trim(),
  };
}

async function listServicePhotos(url: URL, env: Env) {
  const { customer, date } = photoIdentity(url);
  if (!customer || !date) return Response.json({ error: "缺少客戶或日期" }, { status: 400 });
  await ensurePhotoTable(env);
  const arrangementOnly = url.searchParams.get("scope") === "arrangement";
    const query = arrangementOnly
      ? "SELECT id, photo_kind AS kind, created_at AS createdAt FROM service_photos WHERE customer_name = ? AND service_date = ? AND photo_kind LIKE 'arrangement:%' AND deleted_at IS NULL ORDER BY created_at DESC"
      : "SELECT id, photo_kind AS kind, created_at AS createdAt FROM service_photos WHERE customer_name = ? AND service_date = ? AND photo_kind IN ('before', 'after') AND deleted_at IS NULL ORDER BY photo_kind";
  const result = await env.DB.prepare(query).bind(customer, date).all();
  return Response.json({ photos: result.results.map((row: Record<string, unknown>) => ({ ...row, url: `/api/service-photo/${row.id}` })) });
}

async function saveServicePhoto(request: Request, url: URL, env: Env) {
  const { customer, date } = photoIdentity(url);
  const kind = url.searchParams.get("kind");
  if (!customer || !date || (kind !== "before" && kind !== "after" && kind !== "arrangement")) return Response.json({ error: "照片資料不完整" }, { status: 400 });
  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return Response.json({ error: "請選擇照片檔案" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return Response.json({ error: "照片請小於 12MB" }, { status: 413 });
  await ensurePhotoTable(env);
  const id = crypto.randomUUID();
  const storedKind = kind === "arrangement" ? `arrangement:${id}` : kind;
  const objectKey = `service-photos/${id}`;
  await env.PHOTOS.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  if (kind === "arrangement") {
    await env.DB.prepare("INSERT INTO service_photos (id, customer_name, service_date, photo_kind, object_key, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, customer, date, storedKind, objectKey, file.type, new Date().toISOString()).run();
  } else {
    const previous = await env.DB.prepare("SELECT object_key AS objectKey FROM service_photos WHERE customer_name = ? AND service_date = ? AND photo_kind = ?").bind(customer, date, kind).first<{ objectKey: string }>();
    await env.DB.prepare("INSERT INTO service_photos (id, customer_name, service_date, photo_kind, object_key, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(customer_name, service_date, photo_kind) DO UPDATE SET id = excluded.id, object_key = excluded.object_key, content_type = excluded.content_type, created_at = excluded.created_at").bind(id, customer, date, storedKind, objectKey, file.type, new Date().toISOString()).run();
    if (previous?.objectKey) await env.PHOTOS.delete(previous.objectKey);
  }
  return Response.json({ id, kind: storedKind, url: `/api/service-photo/${id}` });
}

async function readServicePhoto(id: string, env: Env) {
  await ensurePhotoTable(env);
  const row = await env.DB.prepare("SELECT object_key AS objectKey, content_type AS contentType FROM service_photos WHERE id = ? AND deleted_at IS NULL").bind(id).first<{ objectKey: string; contentType: string }>();
  if (!row) return new Response("Not found", { status: 404 });
  const object = await env.PHOTOS.get(row.objectKey);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": row.contentType, "cache-control": "private, max-age=3600" } });
}

async function deleteServicePhoto(request: Request, id: string, env: Env) {
  await ensurePhotoTable(env);
  const row = await env.DB.prepare("SELECT id, customer_name AS customerName, service_date AS serviceDate, photo_kind AS kind, object_key AS objectKey FROM service_photos WHERE id = ? AND deleted_at IS NULL").bind(id).first<Record<string, unknown>>();
  if (!row) return new Response(null, { status: 204 });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE service_photos SET deleted_at = ? WHERE id = ?").bind(now, id),
    env.DB.prepare("INSERT INTO wd_audit_log (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, 'delete', 'service_photo', ?, ?, ?, ?)").bind(crypto.randomUUID(), (await currentUser(request, env))?.id || null, id, JSON.stringify(row), JSON.stringify({ deletedAt: now }), now),
  ]);
  return new Response(null, { status: 204 });
}

type CustomerRecordInput = {
  customerName?: string;
  serviceDate?: string;
  serviceType?: string;
  details?: string;
  sourceKey?: string | null;
};

const recordSelect = "SELECT id, customer_name AS customerName, service_date AS serviceDate, service_type AS serviceType, details, source_key AS sourceKey, created_at AS createdAt, updated_at AS updatedAt, status, superseded_by AS supersededBy, void_reason AS voidReason, deleted_at AS deletedAt FROM manual_customer_records";

function validRecord(input: CustomerRecordInput) {
  const customerName = (input.customerName || "").trim();
  const serviceDate = (input.serviceDate || "").trim();
  const serviceType = (input.serviceType || "").trim();
  const details = (input.details || "").trim();
  if (!customerName || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !serviceType || !details) return null;
  return { customerName, serviceDate, serviceType, details, sourceKey: input.sourceKey?.trim() || null };
}

async function listCustomerRecords(request: Request, url: URL, env: Env) {
  const user = await currentUser(request, env); const status = url.searchParams.get("status") || "active";
  const allowed = ["active", "superseded", "voided", "deleted", "all"];
  if (!allowed.includes(status)) return Response.json({ error: "狀態不正確" }, { status: 400 });
  if (status !== "active" && user?.role !== "admin") return Response.json({ error: "需要管理員權限" }, { status: 403 });
  const where = status === "all" ? "1 = 1" : status === "deleted" ? "deleted_at IS NOT NULL" : "deleted_at IS NULL AND status = ?";
  const result = status === "all" ? await env.DB.prepare(`${recordSelect} WHERE ${where} ORDER BY service_date DESC, updated_at DESC`).all() : await env.DB.prepare(`${recordSelect} WHERE ${where} ORDER BY service_date DESC, updated_at DESC`).bind(status).all();
  return Response.json({ records: result.results });
}

async function saveCustomerRecord(request: Request, env: Env) {
  const input = validRecord(await request.json() as CustomerRecordInput);
  if (!input) return Response.json({ error: "請完整填寫客戶、日期、服務類型與內容" }, { status: 400 });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const existing = input.sourceKey ? await env.DB.prepare(`${recordSelect} WHERE source_key = ? AND deleted_at IS NULL`).bind(input.sourceKey).first<Record<string, unknown>>() : null;
  if (existing) {
    await env.DB.batch([
      env.DB.prepare("UPDATE manual_customer_records SET source_key = ?, status = 'superseded', superseded_by = ?, updated_at = ? WHERE id = ?").bind(`superseded:${existing.id}`, id, now, existing.id),
      env.DB.prepare("INSERT INTO manual_customer_records (id, customer_name, service_date, service_type, details, source_key, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')").bind(id, input.customerName, input.serviceDate, input.serviceType, input.details, input.sourceKey, now, now),
      env.DB.prepare("INSERT INTO wd_audit_log (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, 'import_update', 'manual_customer_record', ?, ?, ?, ?)").bind(crypto.randomUUID(), (await currentUser(request, env))?.id || null, existing.id, JSON.stringify(existing), JSON.stringify(input), now),
    ]);
  } else {
    await env.DB.prepare("INSERT INTO manual_customer_records (id, customer_name, service_date, service_type, details, source_key, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')").bind(id, input.customerName, input.serviceDate, input.serviceType, input.details, input.sourceKey, now, now).run();
  }
  const row = await env.DB.prepare(`${recordSelect} WHERE id = ?`).bind(id).first();
  return Response.json(row, { status: 201 });
}

async function updateCustomerRecord(request: Request, id: string, env: Env) {
  const input = validRecord(await request.json() as CustomerRecordInput);
  if (!input) return Response.json({ error: "請完整填寫客戶、日期、服務類型與內容" }, { status: 400 });
  const old = await env.DB.prepare(`${recordSelect} WHERE id = ? AND deleted_at IS NULL`).bind(id).first<Record<string, unknown>>();
  if (!old) return new Response("Not found", { status: 404 });
  const now = new Date().toISOString(); const nextId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO manual_customer_records (id, customer_name, service_date, service_type, details, source_key, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')").bind(nextId, input.customerName, input.serviceDate, input.serviceType, input.details, input.sourceKey, now, now),
    env.DB.prepare("UPDATE manual_customer_records SET status = 'superseded', superseded_by = ?, updated_at = ? WHERE id = ?").bind(nextId, now, id),
    env.DB.prepare("INSERT INTO wd_audit_log (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, 'update', 'manual_customer_record', ?, ?, ?, ?)").bind(crypto.randomUUID(), (await currentUser(request, env))?.id || null, id, JSON.stringify(old), JSON.stringify(input), now),
  ]);
  const row = await env.DB.prepare(`${recordSelect} WHERE id = ?`).bind(nextId).first();
  return Response.json(row);
}

async function reviewCustomerRecord(request: Request, id: string, env: Env) {
  const user = await adminUser(request, env);
  if (!user) return Response.json({ error: "需要管理員權限" }, { status: 403 });
  const body = await request.json() as { action?: string; reason?: string };
  const old = await env.DB.prepare(`${recordSelect} WHERE id = ?`).bind(id).first<Record<string, unknown>>();
  if (!old) return new Response("Not found", { status: 404 });
  const now = new Date().toISOString();
  if (body.action === "delete") {
    await env.DB.prepare("UPDATE manual_customer_records SET deleted_at = ?, status = 'deleted', updated_at = ? WHERE id = ?").bind(now, now, id).run();
  } else if (body.action === "void") {
    await env.DB.prepare("UPDATE manual_customer_records SET status = 'voided', void_reason = ?, updated_at = ? WHERE id = ?").bind((body.reason || "管理員標記作廢").trim(), now, id).run();
  } else if (body.action === "restore") {
    await env.DB.prepare("UPDATE manual_customer_records SET deleted_at = NULL, status = 'active', void_reason = NULL, updated_at = ? WHERE id = ?").bind(now, id).run();
  } else return Response.json({ error: "審查動作不正確" }, { status: 400 });
  await env.DB.prepare("INSERT INTO wd_audit_log (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'manual_customer_record', ?, ?, ?, ?)").bind(crypto.randomUUID(), user.id, body.action, id, JSON.stringify(old), JSON.stringify({ action: body.action, reason: body.reason || null }), now).run();
  return Response.json(await env.DB.prepare(`${recordSelect} WHERE id = ?`).bind(id).first());
}

export default worker;
