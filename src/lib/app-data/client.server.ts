import { createHash } from "node:crypto";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const failureMemo = new Map<string, { at: number; result: CallToolResult }>();
const FAILURE_MEMO_TTL_MS = 15_000;

function tokenKey(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
        sub?: unknown;
        team_id?: unknown;
      };
      const { sub, team_id: teamId } = payload;
      if (typeof sub === "string" && sub) {
        return createHash("sha256")
          .update(JSON.stringify([sub, typeof teamId === "string" ? teamId : null]))
          .digest("base64url");
      }
    }
  } catch {
    // Ignore malformed tokens; fall back to hashing the complete token below.
  }
  return createHash("sha256").update(token).digest("base64url");
}

function memoizedFailure(key: string | null): CallToolResult | null {
  if (!key) return null;
  const hit = failureMemo.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > FAILURE_MEMO_TTL_MS) {
    failureMemo.delete(key);
    return null;
  }
  return hit.result;
}
