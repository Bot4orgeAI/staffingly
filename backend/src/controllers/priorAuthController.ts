import type { Response } from "express";
import { CaseUrgency, PriorAuthStatus, Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../types/index.js";

interface GetCasesQuery {
  page?: string;
  limit?: string;
  status?: PriorAuthStatus;
  urgency?: CaseUrgency;
  clientId?: string;
  assignedSpecialistId?: string;
  search?: string;
}

interface ListDocumentsQuery {
  caseId?: string;
  clientId?: string;
  limit?: string;
  offset?: string;
}

interface ListMessagesQuery {
  caseId?: string;
  clientId?: string;
  readByClient?: string;
  limit?: string;
  offset?: string;
}

interface CreateCaseBody {
  clientId?: string;
  patientName: string;
  patientInitials?: string;
  patientDob?: string;
  insuranceId?: string;
  payerName?: string;
  payerId?: string;
  serviceType?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
  requestingProvider?: string;
  requestingProviderNpi?: string;
  urgency?: CaseUrgency;
  status?: PriorAuthStatus;
  assignedSpecialistId?: string;
}

interface UpdateCaseBody {
  patientName?: string;
  patientInitials?: string;
  patientDob?: string;
  insuranceId?: string;
  payerName?: string;
  payerId?: string;
  serviceType?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
  requestingProvider?: string;
  requestingProviderNpi?: string;
  urgency?: CaseUrgency;
  status?: PriorAuthStatus;
  assignedSpecialistId?: string;
  eligibilityVerified?: boolean;
  denialReason?: string;
  authorizationNumber?: string;
  authValidFrom?: string;
  authValidTo?: string;
  submittedAt?: string;
  approvedAt?: string;
  deniedAt?: string;
  appealSubmittedAt?: string;
}

interface UploadDocumentBody {
  documentType: string;
  fileName: string;
  fileUrl: string;
  checklistItemKey?: string;
}

interface CreateMessageBody {
  caseId: string;
  clientId?: string;
  message: string;
  [key: string]: unknown;
}

export const getCases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    page = "1",
    limit = "20",
    status,
    urgency,
    clientId,
    assignedSpecialistId,
    search,
  } = req.query as GetCasesQuery;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.PriorAuthCaseWhereInput = {};

  if (req.user?.role === "CLIENT_USER" && req.user.clientId) {
    where.clientId = req.user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }

  if (status) {
    where.status = status;
  }

  if (urgency) {
    where.urgency = urgency;
  }

  if (assignedSpecialistId) {
    where.assignedSpecialistId = assignedSpecialistId;
  }

  if (search) {
    where.OR = [
      { caseNumber: { contains: search, mode: "insensitive" } },
      { patientName: { contains: search, mode: "insensitive" } },
      { payerName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [cases, total] = await Promise.all([
    prisma.priorAuthCase.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedSpecialist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            documents: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.priorAuthCase.count({ where }),
  ]);

  res.json({
    success: true,
    data: cases,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const getCaseById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const priorAuthCase = await prisma.priorAuthCase.findUnique({
    where: { id },
    include: {
      client: true,
      assignedSpecialist: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!priorAuthCase) {
    res.status(404).json({
      success: false,
      message: "Prior auth case not found",
    });
    return;
  }

  // Check access
  if (req.user?.role === "CLIENT_USER" && priorAuthCase.clientId !== req.user.clientId) {
    res.status(403).json({
      success: false,
      message: "Access denied",
    });
    return;
  }

  res.json({
    success: true,
    data: priorAuthCase,
  });
};

const VALID_STATUSES = Object.values(PriorAuthStatus);

export const createCase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = req.body as CreateCaseBody;

  // Validate clientId is provided
  const clientId = data.clientId || req.user?.clientId;
  if (!clientId) {
    res.status(400).json({ success: false, error: "clientId is required" });
    return;
  }

  // Generate case number
  const count = await prisma.priorAuthCase.count();
  const caseNumber = `PA-${String(count + 1).padStart(6, "0")}`;

  // Validate status is a valid enum value
  const status =
    data.status && VALID_STATUSES.includes(data.status) ? data.status : PriorAuthStatus.INTAKE;

  const priorAuthCase = await prisma.priorAuthCase.create({
    data: {
      caseNumber,
      clientId,
      patientName: data.patientName,
      patientInitials: data.patientInitials,
      patientDob: data.patientDob ? new Date(data.patientDob) : null,
      insuranceId: data.insuranceId,
      payerName: data.payerName,
      payerId: data.payerId,
      serviceType: data.serviceType,
      diagnosisCodes: data.diagnosisCodes || [],
      procedureCodes: data.procedureCodes || [],
      requestingProvider: data.requestingProvider,
      requestingProviderNpi: data.requestingProviderNpi,
      urgency: data.urgency || "ROUTINE",
      status,
      assignedSpecialistId: data.assignedSpecialistId,
    },
    include: {
      client: true,
      assignedSpecialist: true,
    },
  });

  res.status(201).json({
    success: true,
    data: priorAuthCase,
  });
};

export const updateCase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const data = req.body as UpdateCaseBody;

  const priorAuthCase = await prisma.priorAuthCase.update({
    where: { id },
    data: {
      patientName: data.patientName,
      patientInitials: data.patientInitials,
      patientDob: data.patientDob ? new Date(data.patientDob) : undefined,
      insuranceId: data.insuranceId,
      payerName: data.payerName,
      payerId: data.payerId,
      serviceType: data.serviceType,
      diagnosisCodes: data.diagnosisCodes,
      procedureCodes: data.procedureCodes,
      requestingProvider: data.requestingProvider,
      requestingProviderNpi: data.requestingProviderNpi,
      urgency: data.urgency,
      status: data.status,
      assignedSpecialistId: data.assignedSpecialistId,
      eligibilityVerified: data.eligibilityVerified,
      denialReason: data.denialReason,
      authorizationNumber: data.authorizationNumber,
      authValidFrom: data.authValidFrom ? new Date(data.authValidFrom) : undefined,
      authValidTo: data.authValidTo ? new Date(data.authValidTo) : undefined,
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : undefined,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      deniedAt: data.deniedAt ? new Date(data.deniedAt) : undefined,
      appealSubmittedAt: data.appealSubmittedAt ? new Date(data.appealSubmittedAt) : undefined,
    },
    include: {
      client: true,
      assignedSpecialist: true,
      documents: true,
    },
  });

  res.json({
    success: true,
    data: priorAuthCase,
  });
};

export const deleteCase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.priorAuthCase.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: "Prior auth case deleted successfully",
  });
};

export const uploadDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { documentType, fileName, fileUrl, checklistItemKey } = req.body as UploadDocumentBody;

  const document = await prisma.priorAuthDocument.create({
    data: {
      caseId: id,
      documentType,
      fileName,
      fileUrl,
      checklistItemKey,
      status: "UPLOADED",
      uploadedBy: req.user?.userId || "",
    },
  });

  res.status(201).json({
    success: true,
    data: document,
  });
};

export const getDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const documents = await prisma.priorAuthDocument.findMany({
    where: { caseId: id },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    data: documents,
  });
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  await prisma.priorAuthDocument.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: "Document deleted successfully",
  });
};

export const listDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { caseId, clientId, limit = "100", offset = "0" } = req.query as ListDocumentsQuery;

  const where: Prisma.PriorAuthDocumentWhereInput = {};
  if (caseId) where.caseId = caseId;
  if (clientId) {
    where.case = { clientId };
  }

  const [documents, total] = await Promise.all([
    prisma.priorAuthDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.priorAuthDocument.count({ where }),
  ]);

  res.json({ data: documents, total });
};

export const updateDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const document = await prisma.priorAuthDocument.update({
    where: { id },
    data: req.body as Prisma.PriorAuthDocumentUpdateInput,
  });

  res.json(document);
};

export const listMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    caseId,
    clientId,
    readByClient,
    limit = "100",
    offset = "0",
  } = req.query as ListMessagesQuery;

  const where: Prisma.CaseMessageWhereInput = {};
  if (caseId) where.caseId = caseId;
  if (clientId) where.clientId = clientId;
  if (readByClient !== undefined) where.readByClient = readByClient === "true";

  const [messages, total] = await Promise.all([
    prisma.caseMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
    }),
    prisma.caseMessage.count({ where }),
  ]);

  res.json({ data: messages, total });
};

export const createMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as CreateMessageBody;

  const message = await prisma.caseMessage.create({
    data: {
      ...body,
      senderId: req.user?.userId || "",
    },
  });

  res.status(201).json(message);
};

export const updateMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const message = await prisma.caseMessage.update({
    where: { id },
    data: req.body as Prisma.CaseMessageUpdateInput,
  });

  res.json(message);
};
