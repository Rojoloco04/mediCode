import { createHash } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { jsonResponse, readJson } from "../_shared/http.ts";

interface RequestBody {
  fullName: string;
  workEmail: string;
  role: "first_responder" | "triage_nurse";
  organizationName: string;
  credentialId: string;
  licenseRegion: string;
}

Deno.serve(async (request) => {
  const body = await readJson<RequestBody>(request);
  const credentialIdHash = createHash("sha256").update(body.credentialId).toString();

  return jsonResponse({
    responder: {
      id: crypto.randomUUID(),
      authUserId: null,
      fullName: body.fullName,
      workEmail: body.workEmail,
      role: body.role,
      organizationName: body.organizationName,
      licenseRegion: body.licenseRegion,
      credentialIdHash,
      status: "pending",
      lastVerifiedAt: null,
    },
    registrationMessage: "Responder registration submitted. Approval is required before scanned medical data can be downloaded.",
  });
});
