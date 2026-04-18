import { jsonResponse, readJson } from "../_shared/http.ts";
import type { HealthImportSnapshot, PatientEmergencyProfile } from "../_shared/contracts.ts";

interface RequestBody {
  profile: PatientEmergencyProfile;
  importedSnapshot: HealthImportSnapshot;
}

Deno.serve(async (request) => {
  const body = await readJson<RequestBody>(request);

  const mergedProfile: PatientEmergencyProfile = {
    ...body.profile,
    healthImportStatus: body.importedSnapshot.status,
    lastHealthSyncAt: body.importedSnapshot.importedAt,
    updatedAt: new Date().toISOString(),
  };

  return jsonResponse({ profile: mergedProfile });
});
