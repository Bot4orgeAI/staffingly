const PRIOR_AUTH_CASES = [
  {
    id: "pa-case-00412",
    caseNumber: "PA-00412",
    clientId: "client-sunrise-family-clinic",
    gatewayPatientId: "gp-sarah-mitchell",
    patientName: "Sarah J. Mitchell",
    patientInitials: "SJM",
    patientDob: new Date("1985-03-14"),
    insuranceId: "UHC-884720193",
    payerName: "UnitedHealthcare",
    payerId: "87726",
    serviceType: "Specialist Visit",
    diagnosisCodes: ["M54.50"],
    procedureCodes: ["99214"],
    requestingProvider: "Dr. Maria Lopez",
    requestingProviderNpi: "1760421357",
    urgency: "ROUTINE",
    status: "SUBMITTED",
    assignedSpecialistEmail: "dana@staffingly.com",
    eligibilityVerified: true,
    submittedAt: new Date("2026-03-01T09:18:00Z"),
    createdAt: new Date("2026-03-01T08:45:00Z"),
  },
  {
    id: "pa-case-00411",
    caseNumber: "PA-00411",
    clientId: "client-metro-mental-health-associates",
    gatewayPatientId: "gp-robert-sanchez",
    patientName: "Robert T. Sanchez",
    patientInitials: "RTS",
    patientDob: new Date("1979-12-03"),
    insuranceId: "MCD-112984732",
    payerName: "Medicaid",
    serviceType: "Behavioral Health",
    diagnosisCodes: ["F41.1"],
    procedureCodes: ["90837"],
    requestingProvider: "Dr. Aisha Rahman",
    urgency: "ROUTINE",
    status: "APPROVED",
    assignedSpecialistEmail: "sam@staffingly.com",
    eligibilityVerified: true,
    submittedAt: new Date("2026-03-01T07:20:00Z"),
    approvedAt: new Date("2026-03-01T08:02:00Z"),
    authorizationNumber: "AUTH-883421",
    createdAt: new Date("2026-03-01T06:50:00Z"),
  },
  {
    id: "pa-case-00409",
    caseNumber: "PA-00409",
    clientId: "client-lakeview-orthopedics",
    gatewayPatientId: "gp-marcus-thompson",
    patientName: "Marcus A. Thompson",
    patientInitials: "MAT",
    patientDob: new Date("1968-10-11"),
    insuranceId: "MBI-4EG9-UA8-YK72",
    payerName: "Medicare",
    serviceType: "MRI",
    diagnosisCodes: ["M25.561"],
    procedureCodes: ["73721"],
    requestingProvider: "Dr. James Park",
    urgency: "URGENT",
    status: "DENIED",
    assignedSpecialistEmail: "priya@staffingly.com",
    eligibilityVerified: true,
    submittedAt: new Date("2026-02-28T16:10:00Z"),
    deniedAt: new Date("2026-02-28T18:02:00Z"),
    denialReason: "Medical necessity documentation incomplete",
    createdAt: new Date("2026-02-28T15:20:00Z"),
  },
  {
    id: "pa-case-00408",
    caseNumber: "PA-00408",
    clientId: "client-sunrise-family-clinic",
    gatewayPatientId: "gp-linda-patel",
    patientName: "Linda K. Patel",
    patientInitials: "LKP",
    patientDob: new Date("1990-11-30"),
    insuranceId: "BCBS-774930281",
    payerName: "Blue Cross Blue Shield",
    serviceType: "Physical Therapy",
    diagnosisCodes: ["S83.242A"],
    procedureCodes: ["97110"],
    requestingProvider: "Dr. Maria Lopez",
    urgency: "ROUTINE",
    status: "PENDING_DOCUMENTS",
    assignedSpecialistEmail: "taylor@staffingly.com",
    eligibilityVerified: true,
    createdAt: new Date("2026-02-28T13:05:00Z"),
  },
  {
    id: "pa-case-demo-001",
    caseNumber: "PA-01001",
    clientId: "client-demo",
    gatewayPatientId: "gp-demo-sarah",
    patientName: "Sarah Mitchell",
    patientInitials: "SM",
    patientDob: new Date("1985-03-15"),
    insuranceId: "UHC-884720193",
    payerName: "UnitedHealthcare",
    serviceType: "Pain Management",
    diagnosisCodes: ["M54.16"],
    procedureCodes: ["62323"],
    requestingProvider: "Dr. Amanda Chen",
    urgency: "ROUTINE",
    status: "APPROVED",
    assignedSpecialistEmail: "dana@staffingly.com",
    eligibilityVerified: true,
    submittedAt: new Date("2026-03-03T09:00:00Z"),
    approvedAt: new Date("2026-03-04T11:30:00Z"),
    authorizationNumber: "AUTH-1001",
    createdAt: new Date("2026-03-03T08:15:00Z"),
  },
  {
    id: "pa-case-demo-002",
    caseNumber: "PA-01002",
    clientId: "client-demo",
    gatewayPatientId: "gp-demo-james",
    patientName: "James Holloway",
    patientInitials: "JH",
    patientDob: new Date("1971-07-22"),
    insuranceId: "AETNA-562901847",
    payerName: "Aetna",
    serviceType: "Orthopedic Consult",
    diagnosisCodes: ["M17.11"],
    procedureCodes: ["20610"],
    requestingProvider: "Dr. James T. Lee",
    urgency: "URGENT",
    status: "SUBMITTED",
    assignedSpecialistEmail: "sam@staffingly.com",
    eligibilityVerified: true,
    submittedAt: new Date("2026-03-05T14:05:00Z"),
    createdAt: new Date("2026-03-05T13:25:00Z"),
  },
  {
    id: "pa-case-demo-003",
    caseNumber: "PA-01003",
    clientId: "client-demo",
    gatewayPatientId: "gp-demo-linda",
    patientName: "Linda Patel",
    patientInitials: "LP",
    patientDob: new Date("1990-11-30"),
    insuranceId: "BCBS-774930281",
    payerName: "Blue Cross Blue Shield",
    serviceType: "Imaging",
    diagnosisCodes: ["M54.2"],
    procedureCodes: ["72040"],
    requestingProvider: "Dr. Amanda Chen",
    urgency: "ROUTINE",
    status: "DENIED",
    assignedSpecialistEmail: "priya@staffingly.com",
    eligibilityVerified: true,
    deniedAt: new Date("2026-03-07T10:45:00Z"),
    denialReason: "Coverage not active on date of service",
    createdAt: new Date("2026-03-06T16:10:00Z"),
  },
];

const CASE_MESSAGES = [
  {
    id: "case-message-demo-001",
    caseId: "pa-case-demo-002",
    clientId: "client-demo",
    senderName: "Dana Kim",
    senderRole: "STAFFINGLY_SPECIALIST",
    message:
      "We've submitted 3 new prior auth requests to Aetna this week. Expect responses within 3-5 business days.",
    readByClient: false,
    readByStaff: true,
    createdAt: new Date("2026-03-05T16:40:00Z"),
  },
];

export async function seedPriorAuthCases(prisma) {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          ...new Set(PRIOR_AUTH_CASES.map((item) => item.assignedSpecialistEmail).filter(Boolean)),
        ],
      },
    },
    select: { id: true, email: true },
  });

  const userIdByEmail = Object.fromEntries(users.map((user) => [user.email, user.id]));

  for (const seededCase of PRIOR_AUTH_CASES) {
    const { assignedSpecialistEmail, ...caseData } = seededCase;

    await prisma.priorAuthCase.upsert({
      where: { caseNumber: caseData.caseNumber },
      update: {
        ...caseData,
        assignedSpecialistId: assignedSpecialistEmail
          ? (userIdByEmail[assignedSpecialistEmail] ?? null)
          : null,
      },
      create: {
        ...caseData,
        assignedSpecialistId: assignedSpecialistEmail
          ? (userIdByEmail[assignedSpecialistEmail] ?? null)
          : null,
      },
    });
  }

  for (const message of CASE_MESSAGES) {
    await prisma.caseMessage.upsert({
      where: { id: message.id },
      update: message,
      create: message,
    });
  }

  console.log(`✅ Seeded ${PRIOR_AUTH_CASES.length} prior auth cases`);
  console.log(`✅ Seeded ${CASE_MESSAGES.length} case messages`);
}
