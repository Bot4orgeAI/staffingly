import { Router } from "express";
import * as priorAuthController from "../controllers/priorAuthController.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  createPriorAuthSchema,
  priorAuthGatewayActionSchema,
  updatePriorAuthSchema,
  uploadDocumentSchema,
  paginationSchema,
} from "../lib/schemas.js";

const router = Router();

const WORKER_ROLES = [
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
  "CLIENT_USER",
];

router.use(authenticate);

router.get(
  "/cases",
  requireRoles(...WORKER_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(priorAuthController.getCases)
);

router.get(
  "/cases/:id",
  requireRoles(...WORKER_ROLES),
  asyncHandler(priorAuthController.getCaseById)
);

router.post(
  "/cases",
  requireRoles(...WORKER_ROLES),
  validateBody(createPriorAuthSchema),
  asyncHandler(priorAuthController.createCase)
);

router.put(
  "/cases/:id",
  requireRoles(...WORKER_ROLES),
  validateBody(updatePriorAuthSchema),
  asyncHandler(priorAuthController.updateCase)
);

router.post(
  "/cases/:id/actions",
  requireRoles(...WORKER_ROLES),
  validateBody(priorAuthGatewayActionSchema),
  asyncHandler(priorAuthController.triggerGatewayAction)
);

router.delete(
  "/cases/:id",
  requireRoles("SUPER_ADMIN", "STAFFINGLY_ADMIN"),
  asyncHandler(priorAuthController.deleteCase)
);

router.post(
  "/cases/:id/documents",
  requireRoles(...WORKER_ROLES),
  validateBody(uploadDocumentSchema),
  asyncHandler(priorAuthController.uploadDocument)
);

router.get(
  "/cases/:id/documents",
  requireRoles(...WORKER_ROLES),
  asyncHandler(priorAuthController.getDocuments)
);

router.delete(
  "/documents/:id",
  requireRoles(...WORKER_ROLES),
  asyncHandler(priorAuthController.deleteDocument)
);

// Document routes (direct CRUD)
router.get(
  "/documents",
  requireRoles(...WORKER_ROLES),
  asyncHandler(priorAuthController.listDocuments)
);

router.put(
  "/documents/:id",
  requireRoles(...WORKER_ROLES),
  asyncHandler(priorAuthController.updateDocument)
);

// Case Messages routes
router.get(
  "/messages",
  requireRoles(...WORKER_ROLES),
  asyncHandler(priorAuthController.listMessages)
);

router.post(
  "/messages",
  requireRoles(...WORKER_ROLES),
  asyncHandler(priorAuthController.createMessage)
);

router.put(
  "/messages/:id",
  requireRoles(...WORKER_ROLES),
  asyncHandler(priorAuthController.updateMessage)
);

export default router;
