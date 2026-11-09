var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// elearniz-media-presign.js
var FOLDER_BOLEH = /* @__PURE__ */ new Set(["cards"]);
var EXT_DILARANG = /* @__PURE__ */ new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "php",
  "vbs",
  "js",
  "mjs",
  "scr",
  "msi",
  "dll",
  "com",
  "hta",
  "cpl",
  "pif",
  "reg",
  "jar"
]);
var MIME_DILARANG = /* @__PURE__ */ new Set([
  "application/x-msdownload",
  "application/x-executable",
  "application/x-sh",
  "application/x-bat",
  "text/javascript",
  "application/javascript",
  "application/x-httpd-php"
]);
var UMUR_PRESIGN_DETIK = 90;
var MAKS_PATH = 512;
var ROLE_STAFF = /* @__PURE__ */ new Set(["teacher", "class_admin", "super_admin"]);
function originBoleh(origin, env) {
  if (!origin || origin === "null") return true;
  const daftar = String(env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (daftar.length === 0 || daftar.includes("*") || daftar.includes(origin)) return true;
  let host = "";
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1") return true;
  return daftar.some((d) => {
    try {
      const h = new URL(d).hostname;
      return host === h || host.endsWith("." + h);
    } catch {
      return false;
    }
  });
}
__name(originBoleh, "originBoleh");
function corsHeaders(env, req) {
  const origin = req.headers.get("Origin") || "";
  const boleh = originBoleh(origin, env);
  return {
    "Access-Control-Allow-Origin": boleh ? origin || "*" : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function jsonResponse(obj, status, env, req) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env, req) }
  });
}
__name(jsonResponse, "jsonResponse");
function validasiPath(path) {
  if (typeof path !== "string" || !path || path.length > MAKS_PATH) return false;
  if (path.startsWith("/") || path.includes("..") || path.includes("\\")) return false;
  const seg = path.split("/");
  if (seg.length < 2) return false;
  if (!FOLDER_BOLEH.has(seg[0])) return false;
  if (seg.some((s) => !s || s === "." || s === "..")) return false;
  return /^[A-Za-z0-9._/-]+$/.test(path);
}
__name(validasiPath, "validasiPath");
function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(toHex, "toHex");
async function sha256Hex(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(d);
}
__name(sha256Hex, "sha256Hex");
async function hmacBytes(keyBuf, text) {
  const k = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text)));
}
__name(hmacBytes, "hmacBytes");
async function signingKey(secret, dateStamp, region, service) {
  const kDate = await hmacBytes(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, service);
  return hmacBytes(kService, "aws4_request");
}
__name(signingKey, "signingKey");
function encodeKey(key) {
  return key.split("/").map((s) => encodeURIComponent(s)).join("/");
}
__name(encodeKey, "encodeKey");
async function presignUrl({ method, endpoint, bucket, key, accessKey, secretKey, region, expiresIn }) {
  const ep = new URL(endpoint);
  const host = ep.host;
  const canonicalUri = "/" + bucket + "/" + encodeKey(key);
  const now = /* @__PURE__ */ new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKey}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host"
  });
  const sortedQuery = [...params.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([k2, v]) => `${encodeURIComponent(k2)}=${encodeURIComponent(v)}`).join("&");
  const canonicalHeaders = `host:${host}
`;
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [method, canonicalUri, sortedQuery, canonicalHeaders, "host", payloadHash].join("\n");
  const hashedCanonical = await sha256Hex(canonicalRequest);
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashedCanonical].join("\n");
  const key2 = await signingKey(secretKey, dateStamp, region, "s3");
  const k = await crypto.subtle.importKey("raw", key2, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = toHex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(stringToSign)));
  return `${endpoint.replace(/\/$/, "")}${canonicalUri}?${sortedQuery}&X-Amz-Signature=${sig}`;
}
__name(presignUrl, "presignUrl");
async function jwtValid(env, req) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ") || auth.length < 20) return { state: "tanpa-token", authUserId: null };
  try {
    const r = await fetch(`${String(env.SUPABASE_URL).replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth }
    });
    if (!r.ok) return { state: "token-basi", authUserId: null };
    const me = await r.json();
    return { state: "ok", authUserId: me && me.id || null };
  } catch {
    return { state: "token-basi", authUserId: null };
  }
}
__name(jwtValid, "jwtValid");
async function cekStaff(env, authUserId) {
  if (!authUserId) return { ok: false, detail: "JWT valid tapi tanpa user id." };
  const base = String(env.SUPABASE_URL).replace(/\/$/, "");
  const pakaiService = !!env.SUPABASE_SERVICE_KEY;
  const headers = pakaiService ? { apikey: env.SUPABASE_SERVICE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_KEY } : { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + env.SUPABASE_ANON_KEY };
  try {
    const r = await fetch(
      `${base}/rest/v1/users?auth_user_id=eq.${authUserId}&select=role&limit=1`,
      { headers: { ...headers, "Accept-Profile": "v3" } }
    );
    let txt = await r.text();
    let status = r.status;
    if (!r.ok && pakaiService) {
      const r2 = await fetch(
        `${base}/rest/v1/users?auth_user_id=eq.${authUserId}&select=role&limit=1`,
        { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + env.SUPABASE_ANON_KEY, "Accept-Profile": "v3" } }
      );
      status = r2.status;
      txt = await r2.text();
    }
    if (status < 200 || status >= 300) {
      return { ok: false, detail: `query role HTTP ${status}: ${txt.slice(0, 160)}` };
    }
    let arr = null;
    try {
      arr = JSON.parse(txt);
    } catch {
      arr = null;
    }
    const role = arr && arr[0] && String(arr[0].role || "");
    if (!role) return { ok: false, detail: `baris v3.users ga ketemu utk auth_user_id tsb (query OK, hasil kosong)` };
    return { ok: ROLE_STAFF.has(role), detail: `role=${role}` };
  } catch (e) {
    return { ok: false, detail: "query role gagal jalan: " + (e && e.message) };
  }
}
__name(cekStaff, "cekStaff");
var elearniz_media_presign_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, req) });
    }
    if (url.pathname !== "/presign" || req.method !== "POST") {
      return jsonResponse({ error: "Not found. Pakai POST /presign." }, 404, env, req);
    }
    if (!env.R2_ENDPOINT || !env.R2_BUCKET || !env.R2_ACCESS_KEY || !env.R2_SECRET_KEY) {
      return jsonResponse({ error: "Worker belum dikonfigurasi (R2 env hilang). Jalankan wrangler secret put R2_ACCESS_KEY / R2_SECRET_KEY." }, 500, env, req);
    }
    if (!env.SUPABASE_SERVICE_KEY) {
      return jsonResponse({ error: "Worker belum dikonfigurasi (service key hilang). Jalankan wrangler secret put SUPABASE_SERVICE_KEY." }, 500, env, req);
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Body harus JSON." }, 400, env, req);
    }
    const op = body.op === "delete" ? "delete" : "put";
    const path = String(body.path || "").replace(/^\/+/, "");
    if (!validasiPath(path)) {
      return jsonResponse({ error: "Path tidak diizinkan." }, 400, env, req);
    }
    const { state, authUserId } = await jwtValid(env, req);
    if (state === "tanpa-token") {
      return jsonResponse({ error: "Belum login \u2014 login sebagai staff dulu." }, 401, env, req);
    }
    if (state !== "ok") {
      return jsonResponse({ error: "Sesi tidak valid \u2014 login ulang dulu." }, 401, env, req);
    }
    const cek = await cekStaff(env, authUserId);
    if (!cek.ok) {
      return jsonResponse({
        error: "Akun ini bukan staff \u2014 ga boleh upload.",
        detail: `${cek.detail} \u2022 auth_user_id=${authUserId} \u2022 key=${env.SUPABASE_SERVICE_KEY ? "service" : "anon"}`
      }, 403, env, req);
    }
    const region = env.R2_REGION || "auto";
    try {
      if (op === "put") {
        const contentType = String(body.contentType || "application/octet-stream").toLowerCase();
        const ext = path.split(".").pop().toLowerCase();
        if (EXT_DILARANG.has(ext) || MIME_DILARANG.has(contentType)) {
          return jsonResponse({ error: `File .${ext} tidak diizinkan demi keamanan sistem.` }, 400, env, req);
        }
        const signed2 = await presignUrl({
          method: "PUT",
          endpoint: env.R2_ENDPOINT,
          bucket: env.R2_BUCKET,
          key: path,
          accessKey: env.R2_ACCESS_KEY,
          secretKey: env.R2_SECRET_KEY,
          region,
          expiresIn: UMUR_PRESIGN_DETIK
        });
        const publicUrl = `${String(env.PUBLIC_BASE_URL).replace(/\/$/, "")}/${encodeKey(path)}`;
        return jsonResponse({ url: signed2, method: "PUT", publicUrl, path, expiresIn: UMUR_PRESIGN_DETIK }, 200, env, req);
      }
      const signed = await presignUrl({
        method: "DELETE",
        endpoint: env.R2_ENDPOINT,
        bucket: env.R2_BUCKET,
        key: path,
        accessKey: env.R2_ACCESS_KEY,
        secretKey: env.R2_SECRET_KEY,
        region,
        expiresIn: UMUR_PRESIGN_DETIK
      });
      return jsonResponse({ url: signed, method: "DELETE", path, expiresIn: UMUR_PRESIGN_DETIK }, 200, env, req);
    } catch (e) {
      return jsonResponse({ error: "Gagal membuat presigned URL." }, 500, env, req);
    }
  }
};
export {
  elearniz_media_presign_default as default
};
//# sourceMappingURL=elearniz-media-presign.js.map
