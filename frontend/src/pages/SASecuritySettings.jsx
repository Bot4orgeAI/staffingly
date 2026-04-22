import { useState } from "react";
import { useAuthUserQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Shield, Globe, Key, Bell, Save, CheckCircle } from "lucide-react";

const DEFAULT_GLOBAL = {
  session_timeout_hours: 8,
  otp_expiry_minutes: 5,
  lockout_threshold: 5,
  password_expiry_days: 90,
  concurrent_sessions: 2,
  country_blocking: true,
  approved_countries: ["US", "IN", "PK", "BD"],
};

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

function SettingCard({ icon: Icon, title, color, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div
        className="flex items-center gap-3 px-6 py-4 border-b border-slate-100"
        style={{ backgroundColor: `${color}08` }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h3 className="font-bold text-slate-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function NumericField({ label, value, onChange, min, max, hint }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function SASecuritySettings() {
  const { data: user } = useAuthUserQuery({ withDefaultRole: "super_admin" });
  const [settings, setSettings] = useState(DEFAULT_GLOBAL);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleCountry = (code) => {
    setSettings((s) => ({
      ...s,
      approved_countries: s.approved_countries.includes(code)
        ? s.approved_countries.filter((c) => c !== code)
        : [...s.approved_countries, code],
    }));
  };

  return (
    <StaffinglyLayout
      user={user}
      currentPage="sa-security-settings"
      title="Security Settings"
      breadcrumbs={["Admin", "Security"]}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Super Admin Only Banner */}
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-blue-900"
          style={{ backgroundColor: "#002082" }}
        >
          <Shield className="w-5 h-5 text-yellow-400" />
          <p className="text-white text-sm font-semibold">
            Super Admin Only — All changes are permanently logged to the audit trail
          </p>
        </div>

        {/* Global Settings */}
        <SettingCard icon={Globe} title="Global Security Settings" color="#293682">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <NumericField
              label="Session Timeout (hours)"
              value={settings.session_timeout_hours}
              onChange={(v) => setSettings({ ...settings, session_timeout_hours: v })}
              min={1}
              max={24}
              hint="Users auto-logged out after inactivity"
            />
            <NumericField
              label="OTP Expiry (minutes)"
              value={settings.otp_expiry_minutes}
              onChange={(v) => setSettings({ ...settings, otp_expiry_minutes: v })}
              min={1}
              max={30}
              hint="One-time password lifetime"
            />
            <NumericField
              label="Login Lockout Threshold"
              value={settings.lockout_threshold}
              onChange={(v) => setSettings({ ...settings, lockout_threshold: v })}
              min={3}
              max={10}
              hint="Failed attempts before account lock"
            />
            <NumericField
              label="Password Expiry (days)"
              value={settings.password_expiry_days}
              onChange={(v) => setSettings({ ...settings, password_expiry_days: v })}
              min={30}
              max={365}
              hint="0 = never expires"
            />
            <NumericField
              label="Max Concurrent Sessions"
              value={settings.concurrent_sessions}
              onChange={(v) => setSettings({ ...settings, concurrent_sessions: v })}
              min={1}
              max={5}
              hint="3rd session terminates oldest"
            />
          </div>
        </SettingCard>

        {/* Country Blocking */}
        <SettingCard icon={Globe} title="Country Access Control" color="#0a7e87">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${settings.country_blocking ? "bg-teal-500" : "bg-slate-300"}`}
              onClick={() => setSettings((s) => ({ ...s, country_blocking: !s.country_blocking }))}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.country_blocking ? "translate-x-6" : "translate-x-1"}`}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              Country Blocking {settings.country_blocking ? "Enabled" : "Disabled"}
            </span>
          </div>
          {settings.country_blocking && (
            <div>
              <p className="text-xs text-slate-500 mb-3">
                Select approved countries. All others are blocked before the login screen.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_COUNTRIES.map((c) => {
                  const isOn = settings.approved_countries.includes(c.code);
                  return (
                    <div
                      key={c.code}
                      onClick={() => toggleCountry(c.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-sm ${
                        isOn
                          ? "border-teal-300 bg-teal-50 text-teal-700 font-semibold"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {isOn ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                      )}
                      {c.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SettingCard>

        {/* Security Alerts */}
        <SettingCard icon={Bell} title="Security Alert Recipients" color="#f6b037">
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Configure who receives each type of security alert via email and SMS.
            </p>
            {[
              { event: "Account Lockout", default: "Supervisor + User" },
              { event: "Login from Unregistered IP", default: "Supervisor + User + Admin" },
              { event: "New Device Registration", default: "User" },
              { event: "Failed 2FA Attempt (3+)", default: "Supervisor + Admin" },
              { event: "Concurrent Session Limit Reached", default: "User" },
              { event: "Admin Privilege Action", default: "Super Admin" },
            ].map((alert, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-700">{alert.event}</p>
                  <p className="text-xs text-slate-400">Default: {alert.default}</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600 font-medium">
                    Email ✓
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600 font-medium">
                    SMS ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SettingCard>

        {/* OTP Config */}
        <SettingCard icon={Key} title="Two-Factor Authentication" color="#6d28d9">
          <div className="space-y-3 text-sm">
            {[
              ["OTP Method", "SMS + Email (both required)"],
              ["OTP Length", "6 digits"],
              ["OTP Single Use", "Yes — invalidated after first use"],
              ["New IP Requires", "Fresh 2FA regardless of session age"],
              ["New Device Requires", "Email confirmation + 2FA"],
              ["Max Registered Devices", "3 per user"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">{label}</span>
                <span className="font-semibold text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        </SettingCard>

        {/* Save */}
        <div className="flex justify-end gap-3 pb-4">
          {saved && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4" /> Saved & logged to audit trail
            </div>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold"
            style={{ backgroundColor: "#293682" }}
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>
    </StaffinglyLayout>
  );
}
