import { Router } from "express";
import * as settingsController from "../controllers/settingsController.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { validateBody } from "../middleware/validate.js";
import { securitySettingsSchema } from "../lib/schemas.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN"];

router.use(authenticate);

router.get(
  "/overview",
  requireRoles(...ADMIN_ROLES),
  asyncHandler(settingsController.getSystemOverview)
);

router.get(
  "/security",
  requireRoles("SUPER_ADMIN"),
  asyncHandler(settingsController.getSecuritySettings)
);

router.put(
  "/security",
  requireRoles("SUPER_ADMIN"),
  validateBody(securitySettingsSchema),
  asyncHandler(settingsController.updateSecuritySettings)
);

export default router;
