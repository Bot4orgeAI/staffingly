import { Router } from "express";
import multer from "multer";
import * as uploadController from "../controllers/uploadController.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow common image types for insurance cards
    const allowedTypes = ["image/jpeg", "image/png", "image/heic", "image/heif", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: JPEG, PNG, HEIC, PDF"));
    }
  },
});

router.use(authenticate);

// General file upload
router.post("/file", upload.single("file"), asyncHandler(uploadController.uploadFile));

// General document extraction for eligibility and prior auth support docs
router.post("/extract-data", upload.single("file"), asyncHandler(uploadController.extractDataFromFile));

// ─────────────────────────────────────────────────────────────────────────────
// Insurance Card Upload & OCR Routes
// ─────────────────────────────────────────────────────────────────────────────

// Upload insurance card image
router.post(
  "/insurance-card",
  upload.single("file"),
  asyncHandler(uploadController.uploadInsuranceCard)
);

router.get(
  "/insurance-card/ocr-providers",
  asyncHandler(uploadController.getInsuranceCardOcrProviders)
);

// Extract data from insurance card (either from uploadId or direct file upload)
router.post(
  "/insurance-card/extract",
  upload.single("file"),
  asyncHandler(uploadController.extractInsuranceCard)
);

// Get URL for uploaded insurance card
router.get("/insurance-card/:id/url", asyncHandler(uploadController.getInsuranceCardUrl));

// Confirm reviewed extraction and attach the card to a saved insurance policy
router.post(
  "/insurance-card/:id/confirm",
  asyncHandler(uploadController.confirmInsuranceCard)
);

export default router;
