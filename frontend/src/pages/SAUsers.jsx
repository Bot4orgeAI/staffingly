import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
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

const DUMMY_USERS = [
  {
    id: "1",
    first_name: "Alex",
    last_name: "Rivera",
    email: "alex@staffingly.com",
    role: "super_admin",
    active: true,
    last_login: "2 min ago",
    account_locked: false,
  },
  {
    id: "2",
    first_name: "Jordan",
    last_name: "Chen",
    email: "jordan@staffingly.com",
    role: "finance_admin",
    active: true,
    last_login: "1 hr ago",
    account_locked: false,
  },
  {
    id: "3",
    first_name: "Morgan",
    last_name: "Patel",
    email: "morgan@staffingly.com",
    role: "staffingly_admin",
    active: true,
    last_login: "Today",
    account_locked: false,
  },
  {
    id: "4",
    first_name: "Casey",
    last_name: "Nguyen",
    email: "casey@staffingly.com",
    role: "staffingly_supervisor",
    active: true,
    last_login: "Yesterday",
    account_locked: false,
  },
  {
    id: "5",
    first_name: "Dana",
    last_name: "Kim",
    email: "dana@staffingly.com",
    role: "staffingly_specialist",
    active: false,
    last_login: "3 days ago",
    account_locked: true,
  },
  {
    id: "6",
    first_name: "Drew",
    last_name: "Okafor",
    email: "drew@sunrise-clinic.com",
    role: "client_user",
    active: true,
    last_login: "Today",
    account_locked: false,
  },
];

function UserDrawer({ user, onClose, onSave }) {
  const [form, setForm] = useState(
    user || {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "staffingly_specialist",
      active: true,
      payroll_rate: "",
      payroll_cycle: "monthly",
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">{user ? "Edit User" : "Add User"}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 px-6 py-5 space-y-4">
          {[
            ["First Name", "first_name"],
            ["Last Name", "last_name"],
            ["Email", "email", "email"],
            ["Phone", "phone"],
          ].map(([label, field, type]) => (
            <div key={field}>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                {label}
              </label>
              <input
                value={form[field] || ""}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                type={type || "text"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {(form.role === "staffingly_specialist" || form.role === "staffingly_supervisor") && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Payroll Rate ($/hr)
                </label>
                <input
                  value={form.payroll_rate || ""}
                  onChange={(e) => setForm({ ...form, payroll_rate: e.target.value })}
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Payroll Cycle
                </label>
                <select
                  value={form.payroll_cycle || "monthly"}
                  onChange={(e) => setForm({ ...form, payroll_cycle: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                  {["weekly", "biweekly", "monthly"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Allowed IP Addresses (one per line)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 192.168.1.0/24"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none font-mono"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-slate-700 font-medium">Account Active</label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: "#293682" }}
          >
            {user ? "Update User" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DevicesModal({ user, onClose }) {
  const devices = user.registered_devices || [
    { id: "d1", label: "Chrome / Windows / 1920x1080", trusted: true, added: "2026-01-10" },
    { id: "d2", label: "Safari / macOS / 2560x1440", trusted: true, added: "2026-02-01" },
  ];
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
              <button className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50">
                Revoke
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
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(DUMMY_USERS);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [drawer, setDrawer] = useState(null);
  const [devicesModal, setDevicesModal] = useState(null);

  useEffect(() => {
    api.auth
      .me()
      .then((u) => setUser({ ...u, role: u.role || "super_admin" }))
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch = `${u.first_name} ${u.last_name} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchActive =
      filterActive === "all" || (filterActive === "active" ? u.active : !u.active);
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
          onSave={() => setDrawer(null)}
        />
      )}
      {devicesModal && <DevicesModal user={devicesModal} onClose={() => setDevicesModal(null)} />}

      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none w-48"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            onClick={() => setDrawer("add")}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: "#293682" }}
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
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
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: rc.bg, color: rc.text }}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">—</td>
                      <td className="px-5 py-4 text-slate-500">{u.last_login}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {u.active ? "Active" : "Inactive"}
                        </span>
                        {u.account_locked && (
                          <span className="ml-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
                            Locked
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setDevicesModal(u)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-[11px]"
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
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 text-[11px] ${
                              u.active
                                ? "border-red-200 text-red-500 hover:bg-red-50"
                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {u.active ? (
                              <>
                                <Lock className="w-3 h-3" /> Deactivate
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" /> Activate
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
        </div>
      </div>
    </StaffinglyLayout>
  );
}
