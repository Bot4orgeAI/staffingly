import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthUserQuery } from "@/lib/query";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Shield, Globe, KeyRound, Bell, Save, Loader2 } from "lucide-react";

const ALL_COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "IN", label: "India" },
  { code: "PK", label: "Pakistan" },
  { code: "BD", label: "Bangladesh" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "PH", label: "Philippines" },
];

function SettingCard({ icon: Icon, title, description, tone, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-xl p-2.5 ${tone}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function NumericField({ label, value, onChange, min, max, hint }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
      />
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300"
    >
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      <span
        className={`inline-flex h-6 w-11 items-center rounded-full p-1 transition ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function SASecuritySettings() {
  const queryClient = useQueryClient();
  const { data: user } = useAuthUserQuery({ withDefaultRole: "super_admin" });
  const [settings, setSettings] = useState(null);
  const [baselineSettings, setBaselineSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ["settings", "security"],
    queryFn: () => api.settings.getSecurity(),
  });

  useEffect(() => {
    if (settingsResponse?.data) {
      setSettings(settingsResponse.data);
      setBaselineSettings(settingsResponse.data);
    }
  }, [settingsResponse]);

  const selectedCountries = useMemo(() => settings?.approvedCountries || [], [settings]);
  const alertRecipients = settings?.alertRecipients || [];
  const twoFactorConfig = settings?.twoFactorConfig || {};
  const hasUnsavedChanges = useMemo(() => {
    if (!settings || !baselineSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(baselineSettings);
  }, [baselineSettings, settings]);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleCountry(code) {
    setSettings((current) => {
      const approvedCountries = current.approvedCountries.includes(code)
        ? current.approvedCountries.filter((country) => country !== code)
        : [...current.approvedCountries, code];

      return {
        ...current,
        approvedCountries,
      };
    });
  }

  function updateAlertRecipient(index, key, value) {
    setSettings((current) => ({
      ...current,
      alertRecipients: current.alertRecipients.map((alert, alertIndex) =>
        alertIndex === index ? { ...alert, [key]: value } : alert
      ),
    }));
  }

  async function handleSave() {
    if (!settings) return;

    try {
      setSaving(true);
      await api.settings.updateSecurity(settings);
      await queryClient.invalidateQueries({ queryKey: ["settings", "security"] });
      setBaselineSettings(settings);
      toast({
        title: "Security settings saved",
        description: "The updated platform controls have been stored in the backend.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Unable to save security settings",
        description: error?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <StaffinglyLayout
      user={user}
      currentPage="sa-security-settings"
      title="Security Settings"
      breadcrumbs={["Admin", "Security"]}
    >
      <div className="sv-unified-page max-w-[1400px]">
        <div className="sv-page-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-xl font-semibold text-slate-900">Security Settings</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Configure the backend-backed guardrails for sessions, access control, device trust,
                and security notifications.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4 text-blue-700" />
                Super Admin only
              </div>
              <p className="mt-1 text-blue-700">
                Saved changes become the platform default and should be reviewed carefully.
              </p>
            </div>
          </div>
        </div>

        {isLoading || !settings ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-slate-400 shadow-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading security settings...
            </span>
          </div>
        ) : null}

        {settings ? (
          <>
            <SettingCard
              icon={Shield}
              title="Global Security Controls"
              description="Core session and authentication limits that apply across the platform."
              tone="bg-blue-50 text-blue-700"
            >
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <NumericField
                  label="Session Timeout (hours)"
                  value={settings.sessionTimeoutHours}
                  onChange={(value) => updateSetting("sessionTimeoutHours", value)}
                  min={1}
                  max={24}
                  hint="Automatically signs users out after inactivity."
                />
                <NumericField
                  label="OTP Expiry (minutes)"
                  value={settings.otpExpiryMinutes}
                  onChange={(value) => updateSetting("otpExpiryMinutes", value)}
                  min={1}
                  max={30}
                  hint="Applies to email and SMS verification codes."
                />
                <NumericField
                  label="Lockout Threshold"
                  value={settings.lockoutThreshold}
                  onChange={(value) => updateSetting("lockoutThreshold", value)}
                  min={3}
                  max={10}
                  hint="Failed attempts before a login lockout is triggered."
                />
                <NumericField
                  label="Password Expiry (days)"
                  value={settings.passwordExpiryDays}
                  onChange={(value) => updateSetting("passwordExpiryDays", value)}
                  min={0}
                  max={365}
                  hint="Set to 0 if password rotation is not required."
                />
                <NumericField
                  label="Concurrent Sessions"
                  value={settings.concurrentSessions}
                  onChange={(value) => updateSetting("concurrentSessions", value)}
                  min={1}
                  max={10}
                  hint="Limits how many active sessions a user can keep open."
                />
                <NumericField
                  label="Max Registered Devices"
                  value={twoFactorConfig.maxRegisteredDevices || 3}
                  onChange={(value) =>
                    updateSetting("twoFactorConfig", {
                      ...twoFactorConfig,
                      maxRegisteredDevices: value,
                    })
                  }
                  min={1}
                  max={10}
                  hint="Controls how many remembered devices a user may keep."
                />
              </div>
            </SettingCard>

            <SettingCard
              icon={Globe}
              title="Country Access Control"
              description="Restrict access to approved geographies before the login flow completes."
              tone="bg-emerald-50 text-emerald-700"
            >
              <div className="space-y-4">
                <Toggle
                  checked={settings.countryBlocking}
                  onChange={() => updateSetting("countryBlocking", !settings.countryBlocking)}
                  label={
                    settings.countryBlocking
                      ? "Country blocking enabled"
                      : "Country blocking disabled"
                  }
                  description="Only approved countries will be allowed to sign in."
                />

                {settings.countryBlocking ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {ALL_COUNTRIES.map((country) => {
                      const selected = selectedCountries.includes(country.code);
                      return (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => toggleCountry(country.code)}
                          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                            selected
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold">{country.label}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {country.code}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </SettingCard>

            <SettingCard
              icon={Bell}
              title="Security Alert Routing"
              description="Choose which alert types should send email or SMS notifications."
              tone="bg-amber-50 text-amber-700"
            >
              <div className="space-y-3">
                {alertRecipients.map((alert, index) => (
                  <div
                    key={alert.event}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{alert.event}</p>
                        <p className="mt-1 text-xs text-slate-500">{alert.audience}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateAlertRecipient(index, "email", !alert.email)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            alert.email
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-white text-slate-500"
                          }`}
                        >
                          Email
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAlertRecipient(index, "sms", !alert.sms)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            alert.sms
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-white text-slate-500"
                          }`}
                        >
                          SMS
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SettingCard>

            <SettingCard
              icon={KeyRound}
              title="Two-Factor Authentication"
              description="These controls define the default 2FA posture exposed across admin and client workflows."
              tone="bg-violet-50 text-violet-700"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    OTP Method
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {twoFactorConfig.otpMethod}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    OTP Length
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {twoFactorConfig.otpLength || 6} digits
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <Toggle
                  checked={Boolean(twoFactorConfig.otpSingleUse)}
                  onChange={() =>
                    updateSetting("twoFactorConfig", {
                      ...twoFactorConfig,
                      otpSingleUse: !twoFactorConfig.otpSingleUse,
                    })
                  }
                  label="Single-use OTPs"
                  description="Verification codes are invalidated immediately after successful use."
                />
                <Toggle
                  checked={Boolean(twoFactorConfig.newIpRequiresFresh2fa)}
                  onChange={() =>
                    updateSetting("twoFactorConfig", {
                      ...twoFactorConfig,
                      newIpRequiresFresh2fa: !twoFactorConfig.newIpRequiresFresh2fa,
                    })
                  }
                  label="Fresh 2FA on new IP address"
                  description="Require a new challenge even when the session is still active."
                />
                <Toggle
                  checked={Boolean(twoFactorConfig.newDeviceRequiresEmailConfirmation)}
                  onChange={() =>
                    updateSetting("twoFactorConfig", {
                      ...twoFactorConfig,
                      newDeviceRequiresEmailConfirmation:
                        !twoFactorConfig.newDeviceRequiresEmailConfirmation,
                    })
                  }
                  label="Email confirmation on new device"
                  description="Pair device registration with email confirmation before trust is granted."
                />
              </div>
            </SettingCard>

            {hasUnsavedChanges ? (
              <div className="sticky bottom-4 z-10 flex justify-end">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                  <p className="hidden text-sm text-amber-700 sm:block">
                    You have unsaved changes to security settings.
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="sv-primary-btn disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </StaffinglyLayout>
  );
}
