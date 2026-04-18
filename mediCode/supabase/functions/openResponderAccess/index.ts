import { jsonResponse, readJson } from "../_shared/http.ts";

interface RequestBody {
  shareToken: string;
  responderAccountId: string;
  responderLanguageCode: string;
}

Deno.serve(async (request) => {
  const body = await readJson<RequestBody>(request);
  const [, tokenVersion] = body.shareToken.split(".");

  return jsonResponse({
    sessionId: crypto.randomUUID(),
    profileId: "11111111-2222-3333-4444-555555555555",
    profileVersion: Number(tokenVersion ?? "1"),
    responder: {
      id: body.responderAccountId,
      authUserId: null,
      fullName: "Configured responder",
      workEmail: "responder@medicode.app",
      role: "first_responder",
      organizationName: "Configured organization",
      licenseRegion: "US",
      credentialIdHash: "registered-responder-access",
      status: "active",
      lastVerifiedAt: new Date().toISOString(),
    },
    sourceSummary: {
      fullName: "Resolver provided by backend",
      bloodType: "O+",
      allergies: ["Penicillin"],
      conditions: ["Asthma"],
      medications: ["Albuterol"],
      emergencyContacts: [],
      manualNotes: `Validated token version ${tokenVersion ?? "0"}`,
      sourceLanguage: "en",
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
