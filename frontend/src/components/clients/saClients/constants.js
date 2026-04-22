export const STATUS_OPTIONS = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Onboarding", value: "ONBOARDING" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

export const EMR_SYSTEM_OPTIONS = [
  "Epic",
  "Cerner",
  "athenahealth",
  "eClinicalWorks",
  "DrChrono",
  "Other",
];

export const CLOUD_STORAGE_OPTIONS = ["none", "google_drive", "onedrive", "dropbox", "s3"];

export const STATUS_STYLES = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  ONBOARDING: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-rose-50 text-rose-700",
};
