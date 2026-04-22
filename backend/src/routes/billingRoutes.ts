import { Router } from "express";
import * as billingController from "../controllers/billingController.js";
import { authenticate, requireRoles, authenticateCron } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  createCustomerSchema,
  chargeInvoiceSchema,
  cardInfoSchema,
  cardUpdateLinkSchema,
  updateInvoiceSchema,
  paginationSchema,
} from "../lib/schemas.js";

const router = Router();

const FINANCE_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN"];
const VIEW_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN", "STAFFINGLY_ADMIN", "CLIENT_USER"];

router.post(
  "/customers",
  authenticate,
  requireRoles(...FINANCE_ROLES),
  validateBody(createCustomerSchema),
  asyncHandler(billingController.createCustomer)
);

router.post(
  "/card-info",
  authenticate,
  requireRoles(...FINANCE_ROLES),
  validateBody(cardInfoSchema),
  asyncHandler(billingController.getCardInfo)
);

router.post(
  "/charge",
  authenticate,
  requireRoles(...FINANCE_ROLES),
  validateBody(chargeInvoiceSchema),
  asyncHandler(billingController.chargeInvoice)
);

router.post(
  "/card-update-link",
  authenticate,
  requireRoles(...FINANCE_ROLES),
  validateBody(cardUpdateLinkSchema),
  asyncHandler(billingController.sendCardUpdateLink)
);

router.post(
  "/generate-invoices",
  (req, res, next) => {
    if (req.headers["x-cron-secret"]) {
      return authenticateCron(req, res, next);
    }
    authenticate(req, res, () => {
      requireRoles(...FINANCE_ROLES)(req, res, next);
    });
  },
  asyncHandler(billingController.generateInvoices)
);

router.post(
  "/process-disputes",
  (req, res, next) => {
    if (req.headers["x-cron-secret"]) {
      return authenticateCron(req, res, next);
    }
    authenticate(req, res, () => {
      requireRoles(...FINANCE_ROLES)(req, res, next);
    });
  },
  asyncHandler(billingController.processDisputes)
);

router.get(
  "/invoices",
  authenticate,
  requireRoles(...VIEW_ROLES),
  validateQuery(paginationSchema),
  asyncHandler(billingController.getInvoices)
);

router.get(
  "/invoices/:id",
  authenticate,
  requireRoles(...VIEW_ROLES),
  asyncHandler(billingController.getInvoiceById)
);

router.put(
  "/invoices/:id",
  authenticate,
  requireRoles(...VIEW_ROLES),
  validateBody(updateInvoiceSchema),
  asyncHandler(billingController.updateInvoice)
);

// Billing Profiles
router.get(
  "/profiles",
  authenticate,
  requireRoles(...VIEW_ROLES),
  asyncHandler(billingController.getProfiles)
);

router.get(
  "/profiles/:id",
  authenticate,
  requireRoles(...VIEW_ROLES),
  asyncHandler(billingController.getProfileById)
);

router.put(
  "/profiles/:id",
  authenticate,
  requireRoles(...FINANCE_ROLES),
  asyncHandler(billingController.updateProfile)
);

// Billing Credits
router.get(
  "/credits",
  authenticate,
  requireRoles(...VIEW_ROLES),
  asyncHandler(billingController.getCredits)
);

router.post(
  "/credits",
  authenticate,
  requireRoles(...FINANCE_ROLES),
  asyncHandler(billingController.createCredit)
);

// Audit Logs
router.get(
  "/audit-logs",
  authenticate,
  requireRoles(...VIEW_ROLES),
  asyncHandler(billingController.getAuditLogs)
);

router.post(
  "/audit-logs",
  authenticate,
  requireRoles(...VIEW_ROLES),
  asyncHandler(billingController.createAuditLog)
);

export default router;
