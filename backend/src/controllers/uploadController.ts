import type { Response } from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import type { AuthenticatedRequest } from "../types/index.js";
import prisma from "../lib/prisma.js";
import * as storageService from "../services/storageService.js";
import * as ocrService from "../services/ocrService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const file = req.file as MulterFile | undefined;

  if (!file) {
    res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
    return;
  }

  // In production, you would upload to cloud storage (S3, GCS, etc.)
  // For now, we'll save to local uploads directory
  const uploadsDir = path.join(__dirname, "../../uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${file.originalname}`;
  const filepath = path.join(uploadsDir, filename);

  await fs.writeFile(filepath, file.buffer);

  // Return file URL (in production, this would be cloud storage URL)
  const fileUrl = `/uploads/${filename}`;

  res.json({
    success: true,
    data: {
      file_url: fileUrl,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    },
  });
};

export const extractDataFromFile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const file = req.file as MulterFile | undefined;
  const { documentType = "Other Document", provider = "auto" } = req.body as {
    documentType?: ocrService.SupportedDocumentType;
    provider?: ocrService.OcrProvider;
  };

  if (!file) {
    res.status(400).json({
      success: false,
      error: "File is required",
    });
    return;
  }

  // Validate card front/back constraints using Claude classifier
  if (
    documentType === "Insurance Card Front" ||
    documentType === "Insurance Card Back"
  ) {
    const classification = await ocrService.classifyInsuranceCardSide(file.buffer, file.mimetype);

    if (documentType === "Insurance Card Front") {
      // Front side must be recognized as a card, and must not be the back
      if (!classification.isCard && classification.side !== "front") {
        res.status(400).json({
          success: false,
          error: `Document verification failed: The uploaded file is not recognized as a health insurance card. Please make sure you are uploading a valid insurance card image.`,
        });
        return;
      }
      if (classification.side === "back") {
        res.status(400).json({
          success: false,
          error: `Side mismatch validation failed: You uploaded the back of the card in the slot designated for the Front of the card. Please flip the card and try again.`,
        });
        return;
      }
    } else {
      // Back side: We don't strictly require isCard to be true (since card backs are often just text/barcodes),
      // but we reject if it is explicitly classified as a "front" side.
      if (classification.side === "front") {
        res.status(400).json({
          success: false,
          error: `Side mismatch validation failed: You uploaded the front of the card in the slot designated for the Back of the card. Please upload the side containing disclaimers/phone numbers.`,
        });
        return;
      }
    }
  }

  const extraction = await ocrService.extractDocumentData(
    file.buffer,
    file.mimetype,
    documentType,
    provider
  );

  res.json({
    success: extraction.success,
    data: {
      fields: extraction.fields,
      confidenceScores: extraction.confidenceScores,
      overallConfidence: extraction.overallConfidence,
      requiresReview: extraction.requiresReview,
      lowConfidenceFields: extraction.lowConfidenceFields,
      channelUsed: extraction.channelUsed,
      processingTimeMs: extraction.processingTimeMs,
      documentType,
      provider,
      fileName: file.originalname,
    },
    error: extraction.error,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Insurance Card Upload & OCR
// ─────────────────────────────────────────────────────────────────────────────

interface InsuranceCardUploadBody {
  clientId: string;
  patientId?: string;
  policyId?: string;
  cardSide: "FRONT" | "BACK";
}

interface ConfirmInsuranceCardBody {
  policyId: string;
  patientId?: string;
  extractedFields?: Record<string, string | null>;
  confidenceScores?: Record<string, number>;
  overallConfidence?: number;
  requiresReview?: boolean;
}

interface ExtractInsuranceCardBody {
  uploadId?: string;
  provider?: ocrService.OcrProvider;
}

/**
 * Upload an insurance card image
 * Stores in S3 (production) or local filesystem (development)
 */
export const uploadInsuranceCard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const file = req.file as MulterFile | undefined;
  const { clientId, patientId, policyId, cardSide } = req.body as InsuranceCardUploadBody;

  if (!file) {
    res.status(400).json({
      success: false,
      error: "No file uploaded",
    });
    return;
  }

  if (!clientId) {
    res.status(400).json({
      success: false,
      error: "clientId is required",
    });
    return;
  }

  if (!cardSide || !["FRONT", "BACK"].includes(cardSide)) {
    res.status(400).json({
      success: false,
      error: "cardSide must be FRONT or BACK",
    });
    return;
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/heic", "image/heif"];
  if (!allowedTypes.includes(file.mimetype)) {
    res.status(400).json({
      success: false,
      error: "Invalid file type. Allowed: JPEG, PNG, HEIC",
    });
    return;
  }

  // Upload to storage (S3 or local)
  const uploadResult = await storageService.uploadInsuranceCard(
    file.buffer,
    file.originalname,
    file.mimetype,
    clientId
  );

  // Calculate expiry date (30 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Save upload record to database
  const cardUpload = await prisma.insuranceCardUpload.create({
    data: {
      policyId: policyId || null,
      patientId: patientId || null,
      clientId,
      cardSide,
      originalFileName: file.originalname,
      storageKey: uploadResult.storageKey,
      storageBucket: uploadResult.storageBucket,
      storageType: uploadResult.storageType,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: req.user?.userId || null,
      expiresAt,
    },
  });

  // Get accessible URL
  const accessUrl = await storageService.getInsuranceCardUrl(
    uploadResult.storageKey,
    uploadResult.storageBucket,
    uploadResult.storageType
  );

  res.status(201).json({
    success: true,
    data: {
      id: cardUpload.id,
      storageKey: uploadResult.storageKey,
      storageType: uploadResult.storageType,
      url: accessUrl,
      cardSide,
      expiresAt,
    },
  });
};

/**
 * Extract data from an uploaded insurance card using OCR
 */
export const extractInsuranceCard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { uploadId, provider = "auto" } = req.body as ExtractInsuranceCardBody;
  const file = req.file as MulterFile | undefined;

  let imageBuffer: Buffer;
  let cardUploadId: string | null = null;
  let mimeType: string | undefined;

  if (uploadId) {
    // Extract from previously uploaded card
    const cardUpload = await prisma.insuranceCardUpload.findUnique({
      where: { id: uploadId },
    });

    if (!cardUpload) {
      res.status(404).json({
        success: false,
        error: "Card upload not found",
      });
      return;
    }

    cardUploadId = cardUpload.id;
    mimeType = cardUpload.mimeType;

    // Get the file from storage
    if (cardUpload.storageType === "local") {
      const localPath = path.join(
        __dirname,
        "../../uploads/insurance-cards",
        cardUpload.storageKey.replace("insurance-cards/", "")
      );
      imageBuffer = await fs.readFile(localPath);
    } else {
      // For S3, we need to download the file
      // This would require adding a download function to storageService
      res.status(501).json({
        success: false,
        error: "S3 extraction not yet implemented - upload file directly for extraction",
      });
      return;
    }
  } else if (file) {
    // Extract from directly uploaded file
    imageBuffer = file.buffer;
    mimeType = file.mimetype;
  } else {
    res.status(400).json({
      success: false,
      error: "Either uploadId or file is required",
    });
    return;
  }

  // Run OCR extraction
  const extraction = await ocrService.extractInsuranceCard(imageBuffer, mimeType, provider);

  // Update card upload record with extracted data if we have one
  if (cardUploadId) {
    await prisma.insuranceCardUpload.update({
      where: { id: cardUploadId },
      data: {
        extractedData: JSON.parse(JSON.stringify(extraction.fields)),
        confidenceScores: JSON.parse(
          JSON.stringify(ocrService.getConfidenceScores(extraction.fields))
        ),
        overallConfidence: extraction.overallConfidence,
        requiresReview: extraction.requiresReview,
      },
    });
  }

  res.json({
    success: extraction.success,
    data: {
      fields: ocrService.flattenExtraction(extraction.fields),
      confidenceScores: ocrService.getConfidenceScores(extraction.fields),
      overallConfidence: extraction.overallConfidence,
      requiresReview: extraction.requiresReview,
      lowConfidenceFields: extraction.lowConfidenceFields,
      channelUsed: extraction.channelUsed,
      processingTimeMs: extraction.processingTimeMs,
      uploadId: cardUploadId,
      provider,
    },
    error: extraction.error,
  });
};

export const getInsuranceCardOcrProviders = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const providers = await ocrService.getAvailableOcrProviders();

  res.json({
    success: true,
    data: {
      providers,
      defaultProvider: providers.find((provider) => provider.available)?.id || null,
    },
  });
};

/**
 * Get the URL for an uploaded insurance card
 */
export const getInsuranceCardUrl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params as { id: string };

  const cardUpload = await prisma.insuranceCardUpload.findUnique({
    where: { id },
  });

  if (!cardUpload) {
    res.status(404).json({
      success: false,
      error: "Card upload not found",
    });
    return;
  }

  const url = await storageService.getInsuranceCardUrl(
    cardUpload.storageKey,
    cardUpload.storageBucket,
    cardUpload.storageType as "s3" | "local"
  );

  res.json({
    success: true,
    data: {
      url,
      expiresAt: cardUpload.expiresAt,
    },
  });
};

/**
 * Confirm an extracted insurance card and attach it to a saved policy
 */
export const confirmInsuranceCard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params as { id: string };
  const {
    policyId,
    patientId,
    extractedFields,
    confidenceScores,
    overallConfidence,
    requiresReview,
  } = req.body as ConfirmInsuranceCardBody;

  if (!policyId) {
    res.status(400).json({
      success: false,
      error: "policyId is required",
    });
    return;
  }

  const [cardUpload, policy] = await Promise.all([
    prisma.insuranceCardUpload.findUnique({
      where: { id },
    }),
    prisma.insurancePolicy.findUnique({
      where: { id: policyId },
      include: {
        patient: true,
      },
    }),
  ]);

  if (!cardUpload) {
    res.status(404).json({
      success: false,
      error: "Card upload not found",
    });
    return;
  }

  if (!policy || policy.deletedAt) {
    res.status(404).json({
      success: false,
      error: "Insurance policy not found",
    });
    return;
  }

  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== policy.patient.clientId) {
    res.status(403).json({
      success: false,
      error: "Access denied",
    });
    return;
  }

  if (cardUpload.clientId !== policy.patient.clientId) {
    res.status(400).json({
      success: false,
      error: "Card upload and policy belong to different clients",
    });
    return;
  }

  if (cardUpload.patientId && cardUpload.patientId !== policy.patientId) {
    res.status(400).json({
      success: false,
      error: "Card upload belongs to a different patient",
    });
    return;
  }

  const confirmedUpload = await prisma.insuranceCardUpload.update({
    where: { id },
    data: {
      policyId,
      patientId: patientId || policy.patientId,
      extractedData: extractedFields ? JSON.parse(JSON.stringify(extractedFields)) : undefined,
      confidenceScores: confidenceScores ? JSON.parse(JSON.stringify(confidenceScores)) : undefined,
      overallConfidence,
      requiresReview,
      reviewedAt: new Date(),
      reviewedBy: req.user?.userId || null,
    },
  });

  res.json({
    success: true,
    data: confirmedUpload,
  });
};
