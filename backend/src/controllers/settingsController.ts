import type { Response } from "express";
import prisma from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../types/index.js";

const DEFAULT_ALERT_RECIPIENTS = [
  { event: "Account Lockout", audience: "Supervisor + User", email: true, sms: true },
  {
    event: "Login from Unregistered IP",
    audience: "Supervisor + User + Admin",
    email: true,
    sms: true,
  },
  { event: "New Device Registration", audience: "User", email: true, sms: false },
  { event: "Failed 2FA Attempt (3+)", audience: "Supervisor + Admin", email: true, sms: true },
  {
    event: "Concurrent Session Limit Reached",
    audience: "User",
    email: true,
    sms: false,
  },
  { event: "Admin Privilege Action", audience: "Super Admin", email: true, sms: true },
];

const DEFAULT_TWO_FACTOR_CONFIG = {
  otpMethod: "SMS + Email (both required)",
  otpLength: 6,
  otpSingleUse: true,
  newIpRequiresFresh2fa: true,
  newDeviceRequiresEmailConfirmation: true,
  maxRegisteredDevices: 3,
};

function parseJsonValue<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatSecuritySettings(settings: {
  sessionTimeoutHours: number;
  otpExpiryMinutes: number;
  lockoutThreshold: number;
  passwordExpiryDays: number;
  concurrentSessions: number;
  countryBlocking: boolean;
  approvedCountries: string[];
  alertRecipientsJson: string | null;
  twoFactorConfigJson: string | null;
}) {
  return {
    sessionTimeoutHours: settings.sessionTimeoutHours,
    otpExpiryMinutes: settings.otpExpiryMinutes,
    lockoutThreshold: settings.lockoutThreshold,
    passwordExpiryDays: settings.passwordExpiryDays,
    concurrentSessions: settings.concurrentSessions,
    countryBlocking: settings.countryBlocking,
    approvedCountries: settings.approvedCountries,
    alertRecipients: parseJsonValue(settings.alertRecipientsJson, DEFAULT_ALERT_RECIPIENTS),
    twoFactorConfig: parseJsonValue(settings.twoFactorConfigJson, DEFAULT_TWO_FACTOR_CONFIG),
  };
}

async function getStoredSecuritySettings() {
  return prisma.systemSecuritySettings.findUnique({
    where: { singletonKey: "global" },
  });
}

export async function getSecuritySettings(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const stored = await getStoredSecuritySettings();

  if (!stored) {
    res.json({
      data: {
        sessionTimeoutHours: 8,
        otpExpiryMinutes: 5,
        lockoutThreshold: 5,
        passwordExpiryDays: 90,
        concurrentSessions: 2,
        countryBlocking: true,
        approvedCountries: ["US", "IN", "PK", "BD"],
        alertRecipients: DEFAULT_ALERT_RECIPIENTS,
        twoFactorConfig: DEFAULT_TWO_FACTOR_CONFIG,
      },
    });
    return;
  }

  res.json({ data: formatSecuritySettings(stored) });
}

export async function updateSecuritySettings(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const {
    sessionTimeoutHours,
    otpExpiryMinutes,
    lockoutThreshold,
    passwordExpiryDays,
    concurrentSessions,
    countryBlocking,
    approvedCountries,
    alertRecipients,
    twoFactorConfig,
  } = req.body as {
    sessionTimeoutHours: number;
    otpExpiryMinutes: number;
    lockoutThreshold: number;
    passwordExpiryDays: number;
    concurrentSessions: number;
    countryBlocking: boolean;
    approvedCountries: string[];
    alertRecipients: typeof DEFAULT_ALERT_RECIPIENTS;
    twoFactorConfig: typeof DEFAULT_TWO_FACTOR_CONFIG;
  };

  const updated = await prisma.systemSecuritySettings.upsert({
    where: { singletonKey: "global" },
    create: {
      singletonKey: "global",
      sessionTimeoutHours,
      otpExpiryMinutes,
      lockoutThreshold,
      passwordExpiryDays,
      concurrentSessions,
      countryBlocking,
      approvedCountries,
      alertRecipientsJson: JSON.stringify(alertRecipients),
      twoFactorConfigJson: JSON.stringify(twoFactorConfig),
    },
    update: {
      sessionTimeoutHours,
      otpExpiryMinutes,
      lockoutThreshold,
      passwordExpiryDays,
      concurrentSessions,
      countryBlocking,
      approvedCountries,
      alertRecipientsJson: JSON.stringify(alertRecipients),
      twoFactorConfigJson: JSON.stringify(twoFactorConfig),
    },
  });

  res.json({
    success: true,
    data: formatSecuritySettings(updated),
  });
}

export async function getSystemOverview(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const [clientTotal, activeClientTotal, userTotal, activeUserTotal, payerTotal, auditLogsLast7Days] =
    await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.payerRule.count(),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

  const connectedClients = await prisma.client.findMany({
    where: {
      emrSystem: {
        not: null,
      },
    },
    select: {
      emrSystem: true,
      emrConfigJson: true,
    },
  });

  const configuredClients = connectedClients.filter((client) => {
    if (!client.emrConfigJson) return false;

    try {
      const config = JSON.parse(client.emrConfigJson) as { baseUrl?: string };
      return Boolean(config.baseUrl?.trim());
    } catch {
      return false;
    }
  });

  res.json({
    data: {
      clients: {
        total: clientTotal,
        active: activeClientTotal,
        emrConnected: connectedClients.length,
      },
      users: {
        total: userTotal,
        active: activeUserTotal,
      },
      payers: {
        total: payerTotal,
      },
      audit: {
        eventsLast7Days: auditLogsLast7Days,
      },
      availity: {
        configured: Boolean(
          process.env.AVAILITY_CLIENT_ID?.trim() && process.env.AVAILITY_CLIENT_SECRET?.trim()
        ),
        tokenUrl:
          process.env.AVAILITY_TOKEN_URL || "https://api.availity.com/availity/v1/token",
        eligibilityUrl:
          process.env.AVAILITY_ELIGIBILITY_URL || "https://api.availity.com/availity/v1/coverages",
        authMethod: "OAuth 2.0 Client Credentials (scope: hipaa)",
        configuredClients: configuredClients.length,
      },
    },
  });
}
