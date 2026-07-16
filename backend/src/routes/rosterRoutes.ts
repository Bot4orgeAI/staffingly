import { Router } from "express";
import multer from "multer";
import * as rosterController from "../controllers/rosterController.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// Multer config — CSV and Excel only, 5MB max, memory storage (never written to disk)
const rosterUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "text/plain",
      "application/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are supported for roster imports."));
    }
  },
});

router.use(authenticate);

// Upload a roster CSV — Staffingly ops roles only
router.post(
  "/import",
  rosterUpload.single("file"),
  asyncHandler(rosterController.importRoster)
);

// List past roster imports (metadata only, no PHI)
router.get("/imports", asyncHandler(rosterController.listImports));

// Get the patient work queue for a client
router.get("/queue/:clientId", asyncHandler(rosterController.getQueue));

export default router;
