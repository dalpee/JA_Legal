import type { CaseRecord, Profile } from "../types/portal";

export type PartnerKey = "marlon" | "sebastian";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getPartnerKey(profile?: Profile | null): PartnerKey | null {
  if (!profile) return null;
  const identity = normalize(`${profile.email || ""} ${profile.full_name || ""}`);
  if (identity.includes("marlon")) return "marlon";
  if (identity.includes("sebastian") || identity.includes("abogadosebastianariza")) return "sebastian";
  return null;
}

export function isCaseAssignedToPartner(caseRecord: CaseRecord, partner: PartnerKey) {
  const assignedLawyer = normalize(caseRecord.lawyer || "");
  if (!assignedLawyer) return false;

  return partner === "marlon"
    ? assignedLawyer.includes("marlon")
    : assignedLawyer.includes("sebastian") || assignedLawyer.includes("felipe ariza");
}
