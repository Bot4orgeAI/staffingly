import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import AppSelect from "@/components/ui/app-select";
import { api } from "@/lib/api";
import { Plus, Search, Edit2, X, Lock, Unlock, Monitor } from "lucide-react";

const ROLES = [
  "super_admin",
  "finance_admin",
  "staffingly_admin",
  "staffingly_supervisor",
  "staffingly_specialist",
  "client_user",
];
const ROLE_LABELS = {
  super_admin: "Super Admin",
  finance_admin: "Finance Admin",
  staffingly_admin: "Staffingly Admin",
  staffingly_supervisor: "Supervisor",
  staffingly_specialist: "Specialist",
  client_user: "Client User",
};
const ROLE_COLORS = {
  super_admin: { bg: "#eef3ff", text: "#002082" },
  finance_admin: { bg: "#fffbeb", text: "#b45309" },
  staffingly_admin: { bg: "#eff6ff", text: "#1d4ed8" },
  staffingly_supervisor: { bg: "#f0fdfa", text: "#0f766e" },
  staffingly_specialist: { bg: "#f5f3ff", text: "#6d28d9" },
  client_user: { bg: "#f0fdf4", text: "#15803d" },
};
const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  ...ROLES.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  })),
];
const PAYROLL_CYCLE_OPTIONS = ["weekly", "biweekly", "monthly"];
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function TextField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
      />
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAllowedIpAddresses(value) {
  if (!Array.isArray(value) || value.length === 0) return "";
  return value.join("\n");
}

function parseAllowedIpAddresses(value) {
  if (!value) return [];

  return [...new Set(value.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean))];
}

function normalizeUser(user) {
  const [first_name = "", ...lastParts] = (user.name || "").split(" ");
  const last_name = lastParts.join(" ");

  return {
    id: user.id,
    first_name,
    last_name,
    email: user.email,
    role: user.role?.toLowerCase() || "client_user",
    clientId: user.clientId || user.client?.id || null,
    active: typeof user.active === "boolean" ? user.active : null,
    last_login: formatDateTime(user.lastLoginAt),
    account_locked: typeof user.accountLocked === "boolean" ? user.accountLocked : null,
    allowed_ip_addresses: Array.isArray(user.allowedIpAddresses) ? user.allowedIpAddresses : [],
    client_name: user.client?.name || "",
    registered_devices: Array.isArray(user.registeredDevices) ? user.registeredDevices : [],
    raw: user,
  };
}

function UserDrawer({ user, onClose, onSave, saveError, saving }) {
  const [form, setForm] = useState(
    user || {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "staffingly_specialist",
      active: true,
      account_locked: false,
      allowed_ip_addresses: [],
      allowed_ip_addresses_text: "",
      payroll_rate: "",
      payroll_cycle: "monthly",
    }
  );
  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button
        type="button"
        aria-label="Close user drawer"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%", opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.9 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-gradient-to-br from-[#f7fbfb] via-white to-[#eef3ff] px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#293682]">
                User Management
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">
                {user ? "Edit User" : "Add New User"}
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Manage identity, access, payroll settings, and account restrictions from one drawer.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/60 px-6 py-6">
          {saveError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {saveError}
            </div>
          ) : null}

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Identity Details</h4>
              <p className="mt-1 text-xs text-slate-500">
                Core information used for login, notifications, and account lookup.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="First Name"
                value={form.first_name || ""}
                onChange={updateField("first_name")}
              />
              <TextField
                label="Last Name"
                value={form.last_name || ""}
                onChange={updateField("last_name")}
              />
              <TextField
                label="Email"
                type="email"
                value={form.email || ""}
                onChange={updateField("email")}
              />
              <div className="relative">
                <TextField
                  label="Phone"
                  value={form.phone || ""}
                  onChange={updateField("phone")}
                  placeholder="Not supported yet"
                />
                <div
                  className="absolute inset-0 bg-white/50 cursor-not-allowed"
                  title="Phone field coming soon"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Access Settings</h4>
              <p className="mt-1 text-xs text-slate-500">
                Control the user&apos;s role, account status, and login restrictions.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Role
                </label>
                <AppSelect
                  value={form.role}
                  onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}
                  options={ROLES.map((role) => ({
                    value: role,
                    label: ROLE_LABELS[role],
                  }))}
                  triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:ring-0 focus:border-slate-300"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">Account Active</p>
                <p className="mt-1 text-xs text-slate-500">
                  Inactive accounts remain listed but should not be used for active workflows.
                </p>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, active: !current.active }))}
                  className={`mt-4 inline-flex h-7 w-12 rounded-full transition-colors ${form.active ? "bg-[#293682]" : "bg-slate-300"}`}
                >
                  <span
                    className={`mt-1 h-5 w-5 rounded-full bg-white transition-transform ${form.active ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/30 px-4 py-3">
                <p className="text-sm font-semibold text-rose-800">Account Locked</p>
                <p className="mt-1 text-xs text-rose-600/80">
                  Manually lock this account to immediately revoke login access.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, account_locked: !current.account_locked }))
                  }
                  className={`mt-4 inline-flex h-7 w-12 rounded-full transition-colors ${form.account_locked ? "bg-rose-600" : "bg-slate-300"}`}
                >
                  <span
                    className={`mt-1 h-5 w-5 rounded-full bg-white transition-transform ${form.account_locked ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>
          </section>

          {(form.role === "staffingly_specialist" || form.role === "staffingly_supervisor") && (
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-800">Payroll Settings</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Configure hourly rate and payout cadence for specialist and supervisor accounts.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 relative">
                <div
                  className="absolute inset-0 bg-white/40 z-10 cursor-not-allowed"
                  title="Payroll settings coming soon"
                />
                <div className="opacity-60 pointer-events-none">
                  <TextField
                    label="Payroll Rate ($/hr)"
                    type="number"
                    value={form.payroll_rate || ""}
                    onChange={updateField("payroll_rate")}
                  />
                </div>
                <div className="opacity-60 pointer-events-none">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Payroll Cycle
                  </label>
                  <AppSelect
                    value={form.payroll_cycle || "monthly"}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, payroll_cycle: value }))
                    }
                    options={PAYROLL_CYCLE_OPTIONS}
                    triggerClassName="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:ring-0 focus:border-slate-300"
                  />
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Security Controls</h4>
              <p className="mt-1 text-xs text-slate-500">
                Capture access restrictions or network constraints that apply to this account.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Allowed IP Addresses
                </label>
                <textarea
                  rows={4}
                  value={
                    form.allowed_ip_addresses_text ??
                    formatAllowedIpAddresses(form.allowed_ip_addresses)
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allowed_ip_addresses_text: event.target.value,
                    }))
                  }
                  placeholder={`One IP or CIDR per line
203.0.113.14
198.51.100.0/24`}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700 focus:border-slate-300 focus:outline-none"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Leave blank to allow login from any network. Supports exact IPs and CIDR ranges.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/10 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#293682" }}
          >
            {saving ? "Saving..." : user ? "Update User" : "Create User"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DevicesModal({ user, onClose, onRevoke, revoking }) {
  const devices = user.registered_devices || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">
            Registered Devices — {user.first_name} {user.last_name}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {devices.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">{d.label}</p>
                <p className="text-xs text-slate-400">Added: {d.added}</p>
              </div>
              <button
                type="button"
                onClick={() => onRevoke({ device: d, deviceIndex: i })}
                disabled={revoking}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {revoking ? "Revoking..." : "Revoke"}
              </button>
            </div>
          ))}
          {devices.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">No registered devices</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SAUsers() {
  const { data: user } = useAuthUserQuery({ withDefaultRole: "super_admin" });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [drawer, setDrawer] = useState(null);
  const [devicesModal, setDevicesModal] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loadingUsers } = useEntityListQuery(
    "User",
    { limit: 100 },
    null,
    {
      enabled: Boolean(user),
      select: (data) => data.map(normalizeUser),
    }
  );

  const saveUserMutation = useMutation({
    /** @param {any} form */
    mutationFn: (form) => {
      const payload = {
        email: form.email,
        name: [form.first_name, form.last_name].filter(Boolean).join(" ").trim(),
        role: form.role?.toUpperCase(),
        clientId: form.clientId ?? (drawer && drawer !== "add" ? drawer.clientId : null),
        active: form.active,
        accountLocked: form.account_locked,
        allowedIpAddresses: parseAllowedIpAddresses(
          form.allowed_ip_addresses_text ?? formatAllowedIpAddresses(form.allowed_ip_addresses)
        ),
      };

      if (drawer && drawer !== "add") {
        return api.entities.User.update(drawer.id, payload);
      }

      return api.entities.User.create(payload);
    },
    onSuccess: async () => {
      setDrawer(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.entity.list("User") });
    },
  });

  const toggleStatusMutation = useMutation({
    /** @param {{ id: string, active: boolean }} params */
    mutationFn: ({ id, active }) => api.entities.User.update(id, { active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.entity.list("User") });
    },
  });
  const revokeDeviceMutation = useMutation({
    /** @param {{ device: any, deviceIndex: number }} params */
    mutationFn: ({ device }) => {
      if (!devicesModal) return Promise.reject(new Error("No user selected"));
      return api.client.post(`/api/users/${devicesModal.id}/revoke-device`, {
        deviceId: device.deviceId || null,
        label: device.label || null,
        ipAddress: device.ipAddress || null,
      });
    },
    onSuccess: async (_, { deviceIndex }) => {
      // Update the local modal state so the UI reflects the change immediately
      if (devicesModal) {
        const updatedDevices = [...(devicesModal.registered_devices || [])];
        updatedDevices.splice(deviceIndex, 1);
        setDevicesModal({ ...devicesModal, registered_devices: updatedDevices });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.entity.list("User") });
    },
  });

  useEffect(() => {
    const hasOpenForm = drawer !== null || devicesModal !== null;
    const previousOverflow = document.body.style.overflow;

    if (hasOpenForm) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawer, devicesModal]);

  const filtered = users.filter((u) => {
    const matchSearch = `${u.first_name} ${u.last_name} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchActive =
      filterActive === "all" ||
      (filterActive === "active" ? u.active === true : u.active === false);
    return matchSearch && matchRole && matchActive;
  });

  return (
    <StaffinglyLayout
      user={user}
      currentPage="sa-users"
      title="User Management"
      breadcrumbs={["Admin", "Users"]}
    >
      {drawer !== null && (
        <UserDrawer
          user={drawer === "add" ? null : drawer}
          onClose={() => setDrawer(null)}
          onSave={(form) => saveUserMutation.mutate(form)}
          saveError={saveUserMutation.error?.message || ""}
          saving={saveUserMutation.isPending}
        />
      )}
      {devicesModal && (
        <DevicesModal
          user={devicesModal}
          onClose={() => setDevicesModal(null)}
          onRevoke={(payload) => revokeDeviceMutation.mutate(payload)}
          revoking={revokeDeviceMutation.isPending}
        />
      )}

      <div className="sv-unified-page max-w-[1400px]">
        <div className="sv-page-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage roles, identity, and access restrictions for all system users.
              </p>
            </div>
            <button
              onClick={() => setDrawer("add")}
              className="sv-primary-btn rounded-2xl px-5 py-3 font-bold"
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </div>
        </div>

        <div className="sv-page-toolbar">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="sv-search-input w-full sm:w-72"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AppSelect
                value={filterRole}
                onValueChange={setFilterRole}
                options={ROLE_OPTIONS}
                triggerClassName="sv-select-trigger h-9 w-[170px] focus:ring-0"
              />
              <AppSelect
                value={filterActive}
                onValueChange={setFilterActive}
                options={STATUS_FILTER_OPTIONS}
                triggerClassName="sv-select-trigger h-9 w-[170px] focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="sv-table-card">
          {loadingUsers ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="sv-data-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {[
                      "Name",
                      "Email",
                      "Role",
                      "Clients",
                      "Last Login",
                      "Status",
                      "Security",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => {
                    const rc = ROLE_COLORS[u.role] || ROLE_COLORS.client_user;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: ROLE_COLORS[u.role]?.text || "#293682" }}
                            >
                              {u.first_name?.charAt(0)}
                              {u.last_name?.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-800">
                              {u.first_name} {u.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500">{u.email}</td>
                        <td className="px-5 py-4">
                          <span
                            className="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: rc.bg, color: rc.text }}
                          >
                            {ROLE_LABELS[u.role]}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">{u.client_name || "—"}</td>
                        <td className="px-5 py-4 text-slate-500">{u.last_login}</td>
                        <td className="px-5 py-4">
                          {u.active === null ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span
                              className={`px-2 py-1 rounded-full text-[10px] font-bold ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {u.active ? "Active" : "Inactive"}
                            </span>
                          )}
                          {u.account_locked === true && (
                            <span className="ml-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
                              Locked
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setDevicesModal(u)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                            disabled={u.registered_devices.length === 0}
                          >
                            <Monitor className="w-3 h-3" /> Devices
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDrawer(u)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  id: u.id,
                                  active: u.active === false ? true : false,
                                })
                              }
                              disabled={toggleStatusMutation.isPending}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                u.active === false
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              }`}
                            >
                              {u.active === false ? (
                                <>
                                  <Unlock className="w-3 h-3" /> Activate
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" /> Deactivate
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </StaffinglyLayout>
  );
}
