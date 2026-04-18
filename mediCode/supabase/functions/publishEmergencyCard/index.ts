import { createHash } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { jsonResponse, readJson } from "../_shared/http.ts";

interface RequestBody {
  profileId: string;
  profileVersion: number;
  sourceLanguage: string;
}

Deno.serve(async (request) => {
  const body = await readJson<RequestBody>(request);
  const nonce = crypto.randomUUID();
  const shareToken = `${body.profileId}.${body.profileVersion}.${nonce}`;
  const tokenHash = createHash("sha256").update(shareToken).toString();
  const siteUrl = Deno.env.get("PUBLIC_MEDICODE_URL") ?? "medicode://responder";
  const universalLink = siteUrl.startsWith("medicode://")
    ? `${siteUrl}?token=${encodeURIComponent(shareToken)}`
    : `${siteUrl}/emergency/${body.profileId}?token=${encodeURIComponent(shareToken)}`;

  return jsonResponse({
    shareToken,
    tokenHash,
    tokenVersion: body.profileVersion,
    universalLink,
    publishedAt: new Date().toISOString(),
  });
});
