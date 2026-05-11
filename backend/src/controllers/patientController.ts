import type { Response } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import prisma from "../lib/prisma.js";
import { PolicyType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GetPatientsQuery {
  page?: string;
  limit?: string;
  clientId?: string;
  search?: string;
}

interface PatientWhereInput {
  clientId?: string;
  deletedAt?: null;
  OR?: Array<{
    firstName?: { contains: string; mode: "insensitive" };
    lastName?: { contains: string; mode: "insensitive" };
    email?: { contains: string; mode: "insensitive" };
    phone?: { contains: string };
  }>;
}

interface CreatePatientBody {
  clientId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dob: string;
  gender?: string;
  ssn?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface UpdatePatientBody {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dob?: string;
  gender?: string;
  ssn?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface CreateInsurancePolicyBody {
  policyType?: PolicyType;
  payerId?: string;
  payerName: string;
  memberId: string;
  groupNumber?: string;
  subscriberName?: string;
  subscriberDob?: string;
  subscriberRelationship?: string;
  planName?: string;
  planType?: string;
  effectiveDate?: string;
  terminationDate?: string;
  rxBin?: string;
  rxPcn?: string;
  rxGroup?: string;
  copayPcp?: number;
  copaySpecialist?: number;
}

interface UpdateInsurancePolicyBody extends Partial<CreateInsurancePolicyBody> {
  isActive?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List patients with pagination and search
 */
export const getPatients = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page = "1", limit = "20", clientId, search } = req.query as GetPatientsQuery;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: PatientWhereInput = {
    deletedAt: null, // Exclude soft-deleted patients
  };

  // Filter by client if specified, or use user's client for CLIENT_USER role
  if (clientId) {
    where.clientId = clientId;
  } else if (req.user?.role === "CLIENT_USER" && req.user?.clientId) {
    where.clientId = req.user.clientId;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        client: {
          select: { id: true, name: true, practiceName: true, npi: true, address: true },
        },
        insurancePolicies: {
          where: { deletedAt: null, isActive: true },
          orderBy: { policyType: "asc" },
        },
        _count: {
          select: { insurancePolicies: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.patient.count({ where }),
  ]);

  res.json({
    success: true,
    data: patients,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
};

/**
 * Get a single patient by ID with all insurance policies
 */
export const getPatientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const patient = await prisma.patient.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      client: {
        select: { id: true, name: true, practiceName: true, npi: true, address: true },
      },
      insurancePolicies: {
        where: { deletedAt: null },
        orderBy: [{ policyType: "asc" }, { createdAt: "desc" }],
        include: {
          cardUploads: {
            orderBy: { createdAt: "desc" },
            take: 2, // Latest front and back
          },
        },
      },
    },
  });

  if (!patient) {
    res.status(404).json({ success: false, error: "Patient not found" });
    return;
  }

  // Check access for CLIENT_USER
  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== patient.clientId) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  res.json({ success: true, data: patient });
};

/**
 * Create a new patient
 */
export const createPatient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as CreatePatientBody;
  const clientId = body.clientId || req.user?.clientId;

  // Validate required fields
  if (!clientId || !body.firstName || !body.lastName || !body.dob) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: clientId, firstName, lastName, dob",
    });
    return;
  }

  // Check client access for CLIENT_USER
  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== clientId) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, practiceName: true },
  });

  if (!client) {
    res.status(400).json({
      success: false,
      error: "Invalid clientId. Select a valid client before creating a patient.",
    });
    return;
  }

  const patient = await prisma.patient.create({
    data: {
      clientId,
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      dob: new Date(body.dob),
      gender: body.gender,
      ssn: body.ssn,
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
    },
    include: {
      client: true,
    },
  });

  res.status(201).json({ success: true, data: patient });
};

/**
 * Update a patient
 */
export const updatePatient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdatePatientBody;

  // Check patient exists and not deleted
  const existing = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: "Patient not found" });
    return;
  }

  // Check access for CLIENT_USER
  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== existing.clientId) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      dob: body.dob ? new Date(body.dob) : undefined,
      gender: body.gender,
      ssn: body.ssn,
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
    },
    include: {
      client: {
        select: { id: true, name: true, practiceName: true, npi: true, address: true },
      },
      insurancePolicies: {
        where: { deletedAt: null, isActive: true },
        orderBy: { policyType: "asc" },
      },
    },
  });

  res.json({ success: true, data: patient });
};

/**
 * Soft delete a patient
 */
export const deletePatient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  // Check patient exists and not deleted
  const existing = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: "Patient not found" });
    return;
  }

  // Check access for CLIENT_USER
  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== existing.clientId) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  // Soft delete patient and all insurance policies
  await prisma.$transaction([
    prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.insurancePolicy.updateMany({
      where: { patientId: id },
      data: { deletedAt: new Date() },
    }),
  ]);

  res.json({ success: true, message: "Patient deleted" });
};

// ─────────────────────────────────────────────────────────────────────────────
// Insurance Policy CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add insurance policy to a patient
 */
export const addInsurancePolicy = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: patientId } = req.params as { id: string };
  const body = req.body as CreateInsurancePolicyBody;

  // Validate required fields
  if (!body.payerName || !body.memberId) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: payerName, memberId",
    });
    return;
  }

  // Check patient exists
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
  });

  if (!patient) {
    res.status(404).json({ success: false, error: "Patient not found" });
    return;
  }

  // Check access for CLIENT_USER
  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== patient.clientId) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  const policy = await prisma.insurancePolicy.create({
    data: {
      patientId,
      policyType: body.policyType || "PRIMARY",
      payerId: body.payerId,
      payerName: body.payerName,
      memberId: body.memberId,
      groupNumber: body.groupNumber,
      subscriberName: body.subscriberName,
      subscriberDob: body.subscriberDob ? new Date(body.subscriberDob) : null,
      subscriberRelationship: body.subscriberRelationship,
      planName: body.planName,
      planType: body.planType,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
      terminationDate: body.terminationDate ? new Date(body.terminationDate) : null,
      rxBin: body.rxBin,
      rxPcn: body.rxPcn,
      rxGroup: body.rxGroup,
      copayPcp: body.copayPcp,
      copaySpecialist: body.copaySpecialist,
    },
  });

  res.status(201).json({ success: true, data: policy });
};

/**
 * Update insurance policy
 */
export const updateInsurancePolicy = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: patientId, policyId } = req.params as { id: string; policyId: string };
  const body = req.body as UpdateInsurancePolicyBody;

  // Check policy exists and belongs to patient
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: policyId, patientId, deletedAt: null },
    include: { patient: true },
  });

  if (!policy) {
    res.status(404).json({ success: false, error: "Insurance policy not found" });
    return;
  }

  // Check access for CLIENT_USER
  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== policy.patient.clientId) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  const updatedPolicy = await prisma.insurancePolicy.update({
    where: { id: policyId },
    data: {
      policyType: body.policyType,
      payerId: body.payerId,
      payerName: body.payerName,
      memberId: body.memberId,
      groupNumber: body.groupNumber,
      subscriberName: body.subscriberName,
      subscriberDob: body.subscriberDob ? new Date(body.subscriberDob) : undefined,
      subscriberRelationship: body.subscriberRelationship,
      planName: body.planName,
      planType: body.planType,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      terminationDate: body.terminationDate ? new Date(body.terminationDate) : undefined,
      rxBin: body.rxBin,
      rxPcn: body.rxPcn,
      rxGroup: body.rxGroup,
      copayPcp: body.copayPcp,
      copaySpecialist: body.copaySpecialist,
      isActive: body.isActive,
    },
  });

  res.json({ success: true, data: updatedPolicy });
};

/**
 * Soft delete insurance policy
 */
export const deleteInsurancePolicy = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: patientId, policyId } = req.params as { id: string; policyId: string };

  // Check policy exists and belongs to patient
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: policyId, patientId, deletedAt: null },
    include: { patient: true },
  });

  if (!policy) {
    res.status(404).json({ success: false, error: "Insurance policy not found" });
    return;
  }

  // Check access for CLIENT_USER
  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== policy.patient.clientId) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  await prisma.insurancePolicy.update({
    where: { id: policyId },
    data: { deletedAt: new Date() },
  });

  res.json({ success: true, message: "Insurance policy deleted" });
};

/**
 * Get all insurance policies for a patient
 */
export const getPatientPolicies = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id: patientId } = req.params as { id: string };
  const { includeDeleted } = req.query as { includeDeleted?: string };

  // Check patient exists
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
  });

  if (!patient) {
    res.status(404).json({ success: false, error: "Patient not found" });
    return;
  }

  // Check access for CLIENT_USER
  if (req.user?.role === "CLIENT_USER" && req.user?.clientId !== patient.clientId) {
    res.status(403).json({ success: false, error: "Access denied" });
    return;
  }

  const where: { patientId: string; deletedAt?: null } = { patientId };
  if (includeDeleted !== "true") {
    where.deletedAt = null;
  }

  const policies = await prisma.insurancePolicy.findMany({
    where,
    orderBy: [{ policyType: "asc" }, { createdAt: "desc" }],
    include: {
      cardUploads: {
        orderBy: { createdAt: "desc" },
        take: 2,
      },
    },
  });

  res.json({ success: true, data: policies });
};
