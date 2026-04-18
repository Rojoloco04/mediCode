import { jsonResponse, readJson } from "../_shared/http.ts";

interface RequestBody {
  profileId: string;
  responderAccountId: string;
  action: string;
  targetLanguageCode?: string;
}

Deno.serve(async (request) => {
  const body = await readJson<RequestBody>(request);

  return jsonResponse({
    logged: true,
    profileId: body.profileId,
    responderAccountId: body.responderAccountId,
    action: body.action,
    targetLanguageCode: body.targetLanguageCode ?? null,
    createdAt: new Date().toISOString(),
  });
});
