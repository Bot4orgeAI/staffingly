import { Router } from "express";
import * as patientController from "../controllers/patientController.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Roles that can access patient data
const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
  "CLIENT_USER",
];

// ─────────────────────────────────────────────────────────────────────────────
// Patient Routes
// ─────────────────────────────────────────────────────────────────────────────

// List patients (with pagination and search)
router.get("/", requireRoles(...ALLOWED_ROLES), asyncHandler(patientController.getPatients));

// Get single patient by ID
router.get("/:id", requireRoles(...ALLOWED_ROLES), asyncHandler(patientController.getPatientById));

// Create new patient
router.post("/", requireRoles(...ALLOWED_ROLES), asyncHandler(patientController.createPatient));

// Update patient
router.put("/:id", requireRoles(...ALLOWED_ROLES), asyncHandler(patientController.updatePatient));

// Delete patient (soft delete)
router.delete(
  "/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(patientController.deletePatient)
);

// ─────────────────────────────────────────────────────────────────────────────
// Insurance Policy Routes
// ─────────────────────────────────────────────────────────────────────────────

// Get all policies for a patient
router.get(
  "/:id/insurance",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(patientController.getPatientPolicies)
);

// Add insurance policy to patient
router.post(
  "/:id/insurance",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(patientController.addInsurancePolicy)
);

// Update insurance policy
router.put(
  "/:id/insurance/:policyId",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(patientController.updateInsurancePolicy)
);

// Delete insurance policy (soft delete)
router.delete(
  "/:id/insurance/:policyId",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(patientController.deleteInsurancePolicy)
);

export default router;
