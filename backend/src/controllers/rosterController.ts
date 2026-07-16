import type { Response } from "express";
import { parse } from "csv-parse/sync";
import prisma from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../types/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Column mapping — normalise any EHR export header to a standard key
// ─────────────────────────────────────────────────────────────────────────────

const COLUMN_MAP: Record<string, string> = {
  // First name variants
  "first name": "firstName",
  "pt first": "firstName",
  "patient first name": "firstName",
  fname: "firstName",
  firstname: "firstName",
  "first_name": "firstName",

  // Last name variants
  "last name": "lastName",
  "pt last": "lastName",
  "patient last name": "lastName",
  lname: "lastName",
  lastname: "lastName",
  "last_name": "lastName",

  // Middle name
  "middle name": "middleName",
  "middle_name": "middleName",
  mi: "middleName",

  // Date of birth
  dob: "dob",
  "date of birth": "dob",
  "birth date": "dob",
  birthdate: "dob",
  "date_of_birth": "dob",

  // Gender
  gender: "gender",
  sex: "gender",

  // Contact
  phone: "phone",
  "phone number": "phone",
  telephone: "phone",
  email: "email",

  // Address
  address: "address",
  "street address": "address",
  city: "city",
  state: "state",
  zip: "zip",
  "zip code": "zip",
  postal: "zip",

  // Insurance / payer
  insurance: "payerName",
  payer: "payerName",
  carrier: "payerName",
  "insurance company": "payerName",
  "payer name": "payerName",
  "payer_name": "payerName",

  // Payer ID
  "payer id": "payerId",
  "payer_id": "payerId",
  "insurance id": "payerId",

  // Member ID
  "member id": "memberId",
  "member_id": "memberId",
  "insurance id #": "memberId",
  "ins id": "memberId",
  "subscriber id": "memberId",
  memberid: "memberId",

  // Group number
  "group #": "groupNumber",
  "group number": "groupNumber",
  "group_number": "groupNumber",
  "grp no": "groupNumber",
  group: "groupNumber",

  // Subscriber
  "subscriber name": "subscriberName",
  "subscriber_name": "subscriberName",
  "subscriber dob": "subscriberDob",
  "subscriber_dob": "subscriberDob",
  "subscriber relationship": "subscriberRelationship",
  "subscriber_relationship": "subscriberRelationship",
  relationship: "subscriberRelationship",

  // Plan
  "plan name": "planName",
  "plan_name": "planName",
  plan: "planName",
  "plan type": "planType",
  "plan_type": "planType",

  // Appointment / schedule date
  "appt date": "appointmentDate",
  appointment: "appointmentDate",
  "visit date": "appointmentDate",
  "schedule date": "appointmentDate",
  "appointment date": "appointmentDate",
  "appt_date": "appointmentDate",
  "appointment_date": "appointmentDate",

  // Appointment time
  "appt time": "appointmentTime",
  "appointment time": "appointmentTime",
  time: "appointmentTime",

  // Provider
  provider: "providerName",
  "provider name": "providerName",
  physician: "providerName",
  doctor: "providerName",
  "provider npi": "providerNpi",
  npi: "providerNpi",
};

export function mapHeaders(rawHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const raw of rawHeaders) {
    const normalised = raw.trim().toLowerCase();
    const mapped = COLUMN_MAP[normalised];
    if (mapped) {
      mapping[raw] = mapped;
    }
  }
  return mapping;
}

export function mapRow(
  rawRow: Record<string, string>,
  headerMap: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(rawRow)) {
    const mappedKey = headerMap[rawKey];
    if (mappedKey) {
      result[mappedKey] = (value || "").trim();
    }
  }
  return result;
}

export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Allowed roles for roster upload
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_ROLES = new Set([
  "SUPER_ADMIN",
  "STAFFINGLY_ADMIN",
  "STAFFINGLY_SUPERVISOR",
  "STAFFINGLY_SPECIALIST",
]);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/roster/import
// ─────────────────────────────────────────────────────────────────────────────

export async function importRoster(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = req.user;

  if (!user || !UPLOAD_ROLES.has(user.role)) {
    res.status(403).json({
      success: false,
      error: "Only StaffVerify operations team members can upload patient rosters.",
    });
    return;
  }

  const clientId = (req.body.clientId as string) || "";
  if (!clientId) {
    res.status(400).json({ success: false, error: "clientId is required." });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: "No file uploaded." });
    return;
  }

  // Verify the client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    res.status(404).json({ success: false, error: "Client workspace not found." });
    return;
  }

  // Parse CSV from memory buffer — never written to disk
  let rawRows: Record<string, string>[];
  try {
    rawRows = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
  } catch (parseError) {
    res.status(400).json({
      success: false,
      error: "Failed to parse CSV file. Ensure the file is a valid CSV with headers.",
    });
    return;
  }

  if (rawRows.length === 0) {
    res.status(400).json({ success: false, error: "The CSV file contains no data rows." });
    return;
  }

  // Map column headers
  const firstRow = rawRows[0];
  const rawHeaders = firstRow ? Object.keys(firstRow) : [];
  const headerMap = mapHeaders(rawHeaders);

  let importedCount = 0;
  let skippedCount = 0;
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    if (!rawRow) continue;
    const mapped = mapRow(rawRow, headerMap);
    const rowNum = i + 2; // 1-indexed + header row

    // Required fields check
    if (!mapped.firstName || !mapped.lastName || !mapped.dob) {
      skippedCount++;
      errors.push({ row: rowNum, reason: "Missing required fields: first name, last name, or DOB." });
      continue;
    }

    const dob = parseDate(mapped.dob);
    if (!dob) {
      skippedCount++;
      errors.push({ row: rowNum, reason: `Invalid date of birth: "${mapped.dob}".` });
      continue;
    }

    // Find existing patient or create new one (no unique composite key on these fields)
    let patient = await prisma.patient.findFirst({
      where: {
        clientId,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        dob,
        deletedAt: null,
      },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          clientId,
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          middleName: mapped.middleName || null,
          dob,
          gender: mapped.gender || null,
          phone: mapped.phone || null,
          email: mapped.email || null,
          address: mapped.address || null,
          city: mapped.city || null,
          state: mapped.state || null,
          zip: mapped.zip || null,
        },
      });
    }

    // Create insurance policy if memberId present
    if (mapped.memberId && mapped.payerName) {
      const existingPolicy = await prisma.insurancePolicy.findFirst({
        where: {
          patientId: patient.id,
          memberId: mapped.memberId,
          deletedAt: null,
        },
      });

      if (!existingPolicy) {
        await prisma.insurancePolicy.create({
          data: {
            patientId: patient.id,
            payerId: mapped.payerId || null,
            payerName: mapped.payerName,
            memberId: mapped.memberId,
            groupNumber: mapped.groupNumber || null,
            subscriberName: mapped.subscriberName || null,
            subscriberDob: parseDate(mapped.subscriberDob),
            subscriberRelationship: mapped.subscriberRelationship || null,
            planName: mapped.planName || null,
            planType: mapped.planType || null,
          },
        });
      }
    }

    importedCount++;
  }

  // Create audit record — this is the ONLY thing persisted about the upload itself
  const rosterImport = await prisma.rosterImport.create({
    data: {
      clientId,
      uploadedById: user.userId,
      fileName: req.file.originalname,
      rowCount: rawRows.length,
      importedCount,
      skippedCount,
    },
  });

  // File buffer is automatically discarded — never written to disk

  res.json({
    success: true,
    importId: rosterImport.id,
    fileName: rosterImport.fileName,
    rowCount: rawRows.length,
    importedCount,
    skippedCount,
    errors: errors.slice(0, 20), // cap error details returned
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/roster/imports
// ─────────────────────────────────────────────────────────────────────────────

export async function listImports(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const clientId = (req.query.clientId as string) || "";

  const where: Record<string, unknown> = {};

  if (user.role === "CLIENT_USER") {
    // Clinic staff can only see their own client's imports
    where.clientId = user.clientId;
  } else if (clientId) {
    where.clientId = clientId;
  }

  const imports = await prisma.rosterImport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      clientId: true,
      fileName: true,
      rowCount: true,
      importedCount: true,
      skippedCount: true,
      status: true,
      createdAt: true,
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
      client: {
        select: { id: true, name: true },
      },
    },
  });

  res.json({ success: true, data: imports });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/roster/queue/:clientId
// ─────────────────────────────────────────────────────────────────────────────

export async function getQueue(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let { clientId } = req.params as { clientId: string };

  // CLIENT_USER can only see their own workspace
  if (user.role === "CLIENT_USER") {
    if (!user.clientId) {
      res.status(403).json({ error: "No client workspace associated with your account." });
      return;
    }
    clientId = user.clientId;
  }

  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(100, parseInt((req.query.limit as string) || "50", 10));
  const skip = (page - 1) * limit;

  // Patients that have insurance policies but have never been verified
  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where: {
        clientId,
        deletedAt: null,
        insurancePolicies: {
          some: {
            deletedAt: null,
            lastCoverageStatus: null, // not yet verified
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        insurancePolicies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            payerName: true,
            memberId: true,
            groupNumber: true,
            planName: true,
            planType: true,
            subscriberName: true,
            subscriberRelationship: true,
            lastCoverageStatus: true,
            lastVerifiedAt: true,
          },
        },
      },
    }),
    prisma.patient.count({
      where: {
        clientId,
        deletedAt: null,
        insurancePolicies: { some: { deletedAt: null, lastCoverageStatus: null } },
      },
    }),
  ]);

  res.json({
    success: true,
    data: patients,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
