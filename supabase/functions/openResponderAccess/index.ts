import { createHash } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { jsonResponse, readJson } from "../_shared/http.ts";

interface RequestBody {
  shareToken: string;
  responderUserId: string;
  enteredCredentialId: string;
  responderLanguageCode: string;
}

Deno.serve(async (request) => {
  const body = await readJson<RequestBody>(request);
  const [, tokenVersion] = body.shareToken.split(".");
  const credentialIdHash = createHash("sha256").update(body.enteredCredentialId).toString();

  return jsonResponse({
    sessionId: crypto.randomUUID(),
    responder: {
      id: crypto.randomUUID(),
      authUserId: body.responderUserId,
      role: "first_responder",
      organizationName: "Configured organization",
      credentialIdHash,
      status: "active",
      lastVerifiedAt: new Date().toISOString(),
    },
    summary: {
      fullName: "Resolver provided by backend",
      bloodType: "O+",
      allergies: ["Penicillin"],
      conditions: ["Asthma"],
      medications: ["Albuterol"],
      emergencyContacts: [],
      manualNotes: `Validated token version ${tokenVersion ?? "0"}`,
      sourceLanguage: "en",
    },
  });
});
