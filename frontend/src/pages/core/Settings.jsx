import { useState } from "react";
import { createPageUrl } from "@/lib/utils/page";
import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import AppHeader from "@/components/insuverif/AppHeader";
import { Search, Edit2, Trash2, X, Wifi, WifiOff } from "lucide-react";
import AvailityApiSection from "@/components/insuverif/AvailityApiSection";
import AppSelect from "@/components/ui/app-select";

const EMR_LIST = [
  { name: "Epic", protocol: "FHIR R4", is_connected: true, last_sync: "2 min ago" },
  { name: "Athenahealth", protocol: "REST API", is_connected: true, last_sync: "5 min ago" },
  { name: "eClinicalWorks", protocol: "FHIR R4", is_connected: true, last_sync: "12 min ago" },
  { name: "Cerner / Oracle Health", protocol: "FHIR R4", is_connected: false },
  { name: "NextGen", protocol: "REST API", is_connected: false },
  { name: "DrChrono", protocol: "REST API", is_connected: false },
  { name: "Kareo / Tebra", protocol: "REST API", is_connected: false },
  { name: "AdvancedMD", protocol: "FHIR STU3", is_connected: false },
];

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  STAFFINGLY_ADMIN: "Staffingly Admin",
  STAFFINGLY_SUPERVISOR: "Supervisor",
  STAFFINGLY_SPECIALIST: "Specialist",
  CLIENT_USER: "Client User",
  FINANCE_ADMIN: "Finance Admin",
};

function ConnectModal({ emr, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-slate-800">Connect: {emr.name}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="space-y-3">
          {[
            { label: "EHR System", value: emr.name, readOnly: true },
            { label: "API Endpoint URL", placeholder: "https://api.example.com/fhir" },
            { label: "Client ID", placeholder: "client_id_here" },
            { label: "Client Secret", placeholder: "••••••••", type: "password" },
          ].map(({ label, value, placeholder, readOnly, type }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                {label}
              </label>
              <input
                defaultValue={value}
                placeholder={placeholder}
                readOnly={readOnly}
                type={type || "text"}
                className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none ${readOnly ? "bg-slate-50 text-slate-500" : ""}`}
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              FHIR Version
            </label>
            <AppSelect
              value="R4"
              onValueChange={() => {}}
              options={["R4", "DSTU2", "STU3"]}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: "#0a7e87" }}
          >
            Save Connection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: user } = useAuthUserQuery({
    select: (u) => {
      if (!["super_admin", "staffingly_admin", "admin"].includes((u.role || "").toLowerCase())) {
        window.location.href = createPageUrl("dashboard");
      }
      return u;
    },
  });
  const { data: payerRules = [] } = useEntityListQuery("PayerRule", { limit: 100 }, null);
  const { data: users = [] } = useEntityListQuery("User", { limit: 100 }, null);
  const [activeSection, setActiveSection] = useState("emr");
  const [payerSearch, setPayerSearch] = useState("");
  const [connectModal, setConnectModal] = useState(null);

  const filteredPayers = payerRules.filter((p) =>
    (p.payerName || "").toLowerCase().includes(payerSearch.toLowerCase())
  );

  return (
    <StaffinglyLayout
      user={user}
      currentPage="settings"
      title="System Settings"
      breadcrumbs={["System", "Settings"]}
    >
      {connectModal && <ConnectModal emr={connectModal} onClose={() => setConnectModal(null)} />}

      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage EMR integrations, API credentials, and global system configurations.
              </p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
          {[
            { key: "emr", label: "EMR Connections" },
            { key: "availity", label: "Availity API" },
            { key: "payers", label: "Payer Directory" },
            { key: "users", label: "User Management" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeSection === s.key ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
              style={activeSection === s.key ? { backgroundColor: "#293682" } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* EMR Connections */}
        {activeSection === "emr" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EMR_LIST.map((emr) => (
              <div key={emr.name} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: "#293682" }}
                  >
                    {emr.name.charAt(0)}
                  </div>
                  <span
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${emr.is_connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {emr.is_connected ? (
                      <>
                        <Wifi className="w-3 h-3" /> Connected
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" /> Not Connected
                      </>
                    )}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{emr.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{emr.protocol}</p>
                {emr.is_connected && emr.last_sync && (
                  <p className="text-[11px] text-emerald-600 mt-1">Last sync: {emr.last_sync}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {emr.is_connected ? (
                    <>
                      <button className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button className="px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConnectModal(emr)}
                      className="w-full py-1.5 rounded-lg text-white text-xs font-bold"
                      style={{ backgroundColor: "#0a7e87" }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Availity API */}
        {activeSection === "availity" && <AvailityApiSection />}

        {/* Payer Directory */}
        {activeSection === "payers" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={payerSearch}
                  onChange={(e) => setPayerSearch(e.target.value)}
                  placeholder="Search payers..."
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {[
                      "Payer Name",
                      "EDI Payer ID",
                      "Clearinghouse",
                      "Portal URL",
                      "Contact Phone",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.payerName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{p.payerId || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.submissionMethod || "—"}</td>
                      <td className="px-4 py-3 text-blue-600">{p.portalUrl || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{p.phoneNumber || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Management */}
        {activeSection === "users" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {["Name", "Email", "Role", "Last Login", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{u.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor:
                              u.role === "SUPER_ADMIN"
                                ? "#fef9c3"
                                : u.role === "STAFFINGLY_SPECIALIST"
                                  ? "#f0fdfa"
                                  : "#eef3ff",
                            color:
                              u.role === "SUPER_ADMIN"
                                ? "#a16207"
                                : u.role === "STAFFINGLY_SPECIALIST"
                                  ? "#0f766e"
                                  : "#293682",
                          }}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1">
                            <Edit2 className="w-3 h-3" /> Edit Role
                          </button>
                          <button className="px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50">
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StaffinglyLayout>
  );
}
