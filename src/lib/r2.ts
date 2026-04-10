/**
 * Cloudflare R2 client — manual AWS Signature V4 (no SDK needed).
 * R2 is S3-compatible; region is always "auto".
 */

import { createHmac, createHash } from "crypto";

const ACCOUNT_ID   = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID!;
const SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET       = process.env.R2_BUCKET_NAME ?? "sanoa";
const REGION       = "auto";
const SERVICE      = "s3";

function sha256hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function signingKey(dateStamp: string): Buffer {
  const kDate    = hmac(`AWS4${SECRET_KEY}`, dateStamp);
  const kRegion  = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

/** Format: 20060102T150405Z */
function amzDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Format: 20060102 */
function dateStamp(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function encodePath(key: string): string {
  // Encode each segment but keep forward slashes
  return key.split("/").map(encodeURIComponent).join("/");
}

const baseUrl = () => `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const objectUrl = (key: string) => `${baseUrl()}/${BUCKET}/${encodePath(key)}`;

// ── PUT ────────────────────────────────────────────────────────────────────────

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const now         = new Date();
  const ad          = amzDate(now);
  const ds          = dateStamp(now);
  const host        = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const payloadHash = sha256hex(body);
  const canonPath   = `/${BUCKET}/${encodePath(key)}`;

  const canonHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${ad}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonRequest = [
    "PUT",
    canonPath,
    "",              // no query string
    canonHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope   = `${ds}/${REGION}/${SERVICE}/aws4_request`;
  const sts     = ["AWS4-HMAC-SHA256", ad, scope, sha256hex(canonRequest)].join("\n");
  const sig     = hmac(signingKey(ds), sts).toString("hex");
  const authHdr =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${sig}`;

  const res = await fetch(objectUrl(key), {
    method: "PUT",
    headers: {
      "Content-Type":          contentType,
      "x-amz-date":            ad,
      "x-amz-content-sha256":  payloadHash,
      Authorization:           authHdr,
    },
    // @ts-expect-error Node 18 fetch accepts Buffer
    body,
    // @ts-expect-error needed in some Node versions to prevent body-length issues
    duplex: "half",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`R2 PUT ${res.status}: ${txt}`);
  }
}

// ── GET (pre-signed URL) ───────────────────────────────────────────────────────

export function getPresignedUrl(key: string, expiresIn = 3600): string {
  const now       = new Date();
  const ad        = amzDate(now);
  const ds        = dateStamp(now);
  const host      = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonPath = `/${BUCKET}/${encodePath(key)}`;
  const scope     = `${ds}/${REGION}/${SERVICE}/aws4_request`;
  const credential = `${ACCESS_KEY}/${scope}`;

  // Query params must be sorted alphabetically
  const qp = new URLSearchParams({
    "X-Amz-Algorithm":     "AWS4-HMAC-SHA256",
    "X-Amz-Credential":    credential,
    "X-Amz-Date":          ad,
    "X-Amz-Expires":       String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  });
  // URLSearchParams sorts by insertion order – sort explicitly
  const sortedQs = Array.from(qp.entries())
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonHeaders  = `host:${host}\n`;
  const signedHeaders = "host";

  const canonRequest = [
    "GET",
    canonPath,
    sortedQs,
    canonHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const sts = ["AWS4-HMAC-SHA256", ad, scope, sha256hex(canonRequest)].join("\n");
  const sig = hmac(signingKey(ds), sts).toString("hex");

  return `${baseUrl()}${canonPath}?${sortedQs}&X-Amz-Signature=${sig}`;
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function deleteObject(key: string): Promise<void> {
  const now         = new Date();
  const ad          = amzDate(now);
  const ds          = dateStamp(now);
  const host        = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const payloadHash = sha256hex("");
  const canonPath   = `/${BUCKET}/${encodePath(key)}`;

  const canonHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${ad}\n`;

  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonRequest = [
    "DELETE",
    canonPath,
    "",
    canonHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope   = `${ds}/${REGION}/${SERVICE}/aws4_request`;
  const sts     = ["AWS4-HMAC-SHA256", ad, scope, sha256hex(canonRequest)].join("\n");
  const sig     = hmac(signingKey(ds), sts).toString("hex");
  const authHdr =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${sig}`;

  const res = await fetch(objectUrl(key), {
    method: "DELETE",
    headers: {
      "x-amz-date":           ad,
      "x-amz-content-sha256": payloadHash,
      Authorization:          authHdr,
    },
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const txt = await res.text().catch(() => "");
    throw new Error(`R2 DELETE ${res.status}: ${txt}`);
  }
}
