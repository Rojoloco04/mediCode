export type HealthImportStatus =
  | "notStarted"
  | "pendingReview"
  | "ready"
  | "partial"
  | "denied"
  | "unavailable";

export type ResponderRole = "first_responder" | "triage_nurse";
export type ResponderStatus = "pending" | "active" | "suspended";

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
}

export interface PatientEmergencyProfile {
  id: string;
  ownerUserId: string;
  sourceLanguage: string;
  fullName: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContacts: EmergencyContact[];
  manualNotes: string;
  healthImportStatus: HealthImportStatus;
  lastHealthSyncAt: string | null;
  publishedShareTokenVersion: number;
  updatedAt: string;
}

export interface HealthImportSnapshot {
  bloodType: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  importedAt: string;
  status: HealthImportStatus;
}

export interface EmergencySummary {
  fullName: string;
  bloodType: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContacts: EmergencyContact[];
  manualNotes: string | null;
  sourceLanguage: string;
}

export interface ResponderAccount {
  id: string;
  authUserId: string | null;
  fullName: string;
  workEmail: string;
  role: ResponderRole;
  organizationName: string;
  licenseRegion: string;
  credentialIdHash: string;
  status: ResponderStatus;
  lastVerifiedAt: string | null;
}

export interface OpenResponderAccessResponse {
  sessionId: string;
  profileId: string;
  profileVersion: number;
  responder: ResponderAccount;
  sourceSummary: EmergencySummary;
  summary: EmergencySummary;
}
