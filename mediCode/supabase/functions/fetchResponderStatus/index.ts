import { createHash } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { jsonResponse, readJson } from "../_shared/http.ts";

interface RequestBody {
  workEmail: string;
  credentialId: string;
}

Deno.serve(async (request) => {
  const body = await readJson<RequestBody>(request);
  const credentialIdHash = createHash("sha256").update(body.credentialId).toString();

  return jsonResponse({
    responder: {
      id: crypto.randomUUID(),
      authUserId: null,
      fullName: "Approved Responder",
      workEmail: body.workEmail,
      role: "first_responder",
      organizationName: "Configured organization",
      licenseRegion: "US",
      credentialIdHash,
      status: "active",
      lastVerifiedAt: new Date().toISOString(),
    },
    statusMessage: "Responder account is active.",
  });
});
