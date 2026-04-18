import { jsonResponse, readJson } from "../_shared/http.ts";
import type { EmergencySummary } from "../_shared/contracts.ts";

interface RequestBody {
  profileId: string;
  profileVersion: number;
  summary: EmergencySummary;
  targetLanguageCode: string;
}

async function translateText(text: string, targetLanguageCode: string) {
  const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
  const projectId = Deno.env.get("GOOGLE_TRANSLATE_PROJECT_ID");

  if (!apiKey || !projectId) {
    return text;
  }

  const response = await fetch(
    `https://translation.googleapis.com/v3/projects/${projectId}/locations/global:translateText?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mimeType: "text/plain",
        targetLanguageCode,
        contents: [text],
      }),
    },
  );

  const payload = await response.json();
  return payload.translations?.[0]?.translatedText ?? text;
}

Deno.serve(async (request) => {
  const body = await readJson<RequestBody>(request);

  const translatedSummary: EmergencySummary = {
    ...body.summary,
    allergies: await Promise.all(body.summary.allergies.map((item) => translateText(item, body.targetLanguageCode))),
    conditions: await Promise.all(body.summary.conditions.map((item) => translateText(item, body.targetLanguageCode))),
    medications: await Promise.all(body.summary.medications.map((item) => translateText(item, body.targetLanguageCode))),
    manualNotes: body.summary.manualNotes
      ? await translateText(body.summary.manualNotes, body.targetLanguageCode)
      : null,
  };

  return jsonResponse({
    translatedSummary,
    targetLanguageCode: body.targetLanguageCode,
    cacheHit: false,
  });
});
