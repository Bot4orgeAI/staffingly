import { Router } from "express";
import * as clientController from "../controllers/clientController.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { createClientSchema, updateClientSchema, paginationSchema } from "../lib/schemas.js";

const router = Router();

const ADMIN_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN"];
const VIEW_ROLES = ["SUPER_ADMIN", "STAFFINGLY_ADMIN", "STAFFINGLY_SUPERVISOR", "CLIENT_USER"];

router.use(authenticate);

router.get(
  "/",
  requireRoles(...VIEW_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(clientController.getClients)
);

// Client Branding routes
router.get("/branding", requireRoles(...VIEW_ROLES), asyncHandler(clientController.listBranding));

router.get(
  "/branding/:id",
  requireRoles(...VIEW_ROLES),
  asyncHandler(clientController.getBrandingById)
);

router.post(
  "/branding",
  requireRoles(...ADMIN_ROLES),
  asyncHandler(clientController.createBranding)
);

router.put(
  "/branding/:id",
  requireRoles(...ADMIN_ROLES),
  asyncHandler(clientController.updateBranding)
);

// Client Notifications routes
router.get(
  "/notifications",
  requireRoles(...VIEW_ROLES),
  asyncHandler(clientController.listNotifications)
);

router.post(
  "/notifications",
  requireRoles(...VIEW_ROLES),
  asyncHandler(clientController.createNotification)
);

router.put(
  "/notifications/:id",
  requireRoles(...VIEW_ROLES),
  asyncHandler(clientController.updateNotification)
);

router.get("/:id", requireRoles(...VIEW_ROLES), asyncHandler(clientController.getClientById));

router.post(
  "/",
  requireRoles(...ADMIN_ROLES),
  validateBody(createClientSchema),
  asyncHandler(clientController.createClient)
);

router.put(
  "/:id",
  requireRoles(...ADMIN_ROLES),
  validateBody(updateClientSchema),
  asyncHandler(clientController.updateClient)
);

router.delete("/:id", requireRoles(...ADMIN_ROLES), asyncHandler(clientController.deleteClient));

export default router;
