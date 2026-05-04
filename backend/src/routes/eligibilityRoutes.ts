import { Router } from "express";
import * as eligibilityController from "../controllers/eligibilityController.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  bulkEligibilityBatchSchema,
  eligibilityCheckSchema,
  paginationSchema,
} from "../lib/schemas.js";

const router = Router();

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
  "CLIENT_USER",
];

router.use(authenticate);

router.post(
  "/check",
  requireRoles(...ALLOWED_ROLES),
  validateBody(eligibilityCheckSchema),
  asyncHandler(eligibilityController.checkEligibility)
);

router.post(
  "/batch",
  requireRoles(...ALLOWED_ROLES),
  validateBody(bulkEligibilityBatchSchema),
  asyncHandler(eligibilityController.createBulkBatch)
);

router.get(
  "/batch/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(eligibilityController.getBulkBatch)
);

router.get(
  "/history",
  requireRoles(...ALLOWED_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(eligibilityController.getHistory)
);

router.get("/:id", requireRoles(...ALLOWED_ROLES), asyncHandler(eligibilityController.getById));

// EligibilityHistory CRUD (for legacy frontend compatibility)
router.post(
  "/history",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(eligibilityController.createHistory)
);

router.put(
  "/history/:id",
  requireRoles(...ALLOWED_ROLES),
  asyncHandler(eligibilityController.updateHistory)
);

export default router;
