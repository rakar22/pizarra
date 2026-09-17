#!/usr/bin/env node
/**
 * Production deploy to Hostinger Node.js (Nitro).
 * Reads HOSTINGER_API_TOKEN from the environment. Never prints it.
 */
import { readFileSync, statSync } from "node:fs";

const token = process.env.HOSTINGER_API_TOKEN;
const domain = process.env.HOSTINGER_DOMAIN || "pizarra.utilix.cloud";
const username = process.env.HOSTINGER_USERNAME || "u591947527";
const archive = process.env.HOSTINGER_ARCHIVE || "pizarra.zip";

if (!token) {
  console.error("HOSTINGER_API_TOKEN is not set");
  process.exit(1);
}

const api = "https://developers.hostinger.com";
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function apiJson(method, path, body) {
  const res = await fetch(`${api}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    const msg = data.message || data.detail || res.statusText;
    throw new Error(`Hostinger ${method} ${path} -> ${res.status} ${msg}`);
  }
  return data;
}

const size = statSync(archive).size;
console.log(`archive ${archive} bytes=${size} domain=${domain}`);

const upload = await apiJson("POST", "/api/hosting/v1/files/upload-urls", { username, domain });
const tusBase = String(upload.url).replace(/\/$/, "");
const tusHeaders = {
  "X-Auth": upload.auth_key,
  "X-Auth-Rest": upload.rest_auth_key,
  "Tus-Resumable": "1.0.0",
  "User-Agent": "curl/8.7.1",
};

const dest = `${tusBase}/${archive}?override=true`;
const created = await fetch(dest, {
  method: "POST",
  headers: { ...tusHeaders, "Upload-Length": String(size), "Upload-Offset": "0" },
});
if (created.status !== 201 && created.status !== 200) {
  throw new Error(`TUS POST ${created.status}`);
}

const bytes = readFileSync(archive);
const patched = await fetch(dest, {
  method: "PATCH",
  headers: {
    ...tusHeaders,
    "Content-Type": "application/offset+octet-stream",
    "Upload-Offset": "0",
  },
  body: bytes,
});
if (patched.status !== 204 && patched.status !== 200) {
  throw new Error(`TUS PATCH ${patched.status}`);
}
console.log("archive uploaded");

const build = await apiJson(
  "POST",
  `/api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`,
  {
    node_version: 22,
    app_type: "nitro",
    root_directory: null,
    output_directory: ".output",
    build_script: "build",
    entry_file: "server/index.mjs",
    package_manager: "npm",
    source_type: "archive",
    source_options: { archive_path: archive },
  },
);
const uuid = build.uuid;
console.log(`build started ${uuid}`);

for (let i = 0; i < 24; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const list = await apiJson(
    "GET",
    `/api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`,
  );
  const row = (list.data || []).find((b) => b.uuid === uuid);
  const state = row?.state || "unknown";
  console.log(`build ${state}`);
  if (state === "completed") {
    console.log("deploy completed");
    process.exit(0);
  }
  if (state === "failed" || state === "error") {
    throw new Error(`build ${state}`);
  }
}

throw new Error("build timed out");
