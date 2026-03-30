import type { Response } from "express";
import type { File as MulterFile } from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import type { AuthenticatedRequest } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MulterRequest extends AuthenticatedRequest {
  file?: MulterFile;
}

export const uploadFile = async (req: MulterRequest, res: Response): Promise<void> => {
  if (!req.file) {
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

  const filename = `${Date.now()}-${req.file.originalname}`;
  const filepath = path.join(uploadsDir, filename);

  await fs.writeFile(filepath, req.file.buffer);

  // Return file URL (in production, this would be cloud storage URL)
  const fileUrl = `/uploads/${filename}`;

  res.json({
    success: true,
    data: {
      file_url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
};

export const extractDataFromFile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { fileUrl, documentType } = req.body as { fileUrl?: string; documentType?: string };

  // TODO: Implement AI-powered document extraction
  // This would call an LLM service (OpenAI, Claude, etc.) to extract structured data
  // from the document

  // For now, return placeholder data
  res.json({
    success: true,
    data: {
      extracted: {
        patientName: null,
        patientDob: null,
        insuranceId: null,
        diagnosisCodes: [],
        procedureCodes: [],
      },
      confidence: 0,
      message: "Document extraction not yet implemented",
      fileUrl,
      documentType,
    },
  });
};
