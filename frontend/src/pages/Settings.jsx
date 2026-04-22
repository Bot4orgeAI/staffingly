import { useState } from "react";
import { createPageUrl } from "@/lib/utils/page";
import { useAuthUserQuery } from "@/lib/query";
import AppHeader from "@/components/insuverif/AppHeader";
import { Search, Edit2, Trash2, X, Wifi, WifiOff } from "lucide-react";
import AvailityApiSection from "@/components/insuverif/AvailityApiSection";

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

const PAYERS = [
  {
    payer_name: "UnitedHealthcare",
    edi_payer_id: "87726",
    clearinghouse: "Availity",
    portal_url: "uhcprovider.com",
    contact_phone: "1-800-842-3585",
  },
  {
    payer_name: "Aetna",
    edi_payer_id: "60054",
    clearinghouse: "Availity",
    portal_url: "aetna.com/health-care-professionals",
    contact_phone: "1-800-624-0756",
  },
  {
    payer_name: "Cigna",
    edi_payer_id: "62308",
    clearinghouse: "Change Healthcare",
    portal_url: "cigna.com/providers",
    contact_phone: "1-800-88-cigna",
  },
  {
    payer_name: "Humana",
    edi_payer_id: "61101",
    clearinghouse: "Availity",
    portal_url: "humana.com/provider",
    contact_phone: "1-800-448-6262",
  },
  {
    payer_name: "Blue Cross Blue Shield",
    edi_payer_id: "00630",
    clearinghouse: "Availity",
    portal_url: "bcbs.com",
    contact_phone: "1-800-676-2583",
  },
  {
    payer_name: "Medicare",
    edi_payer_id: "CMS",
    clearinghouse: "Palmetto GBA",
    portal_url: "medicare.gov",
    contact_phone: "1-800-633-4227",
  },
  {
    payer_name: "Medicaid",
    edi_payer_id: "77799",
    clearinghouse: "State-based",
    portal_url: "medicaid.gov",
    contact_phone: "1-877-267-2323",
  },
  {
    payer_name: "Tricare",
    edi_payer_id: "TRIC",
    clearinghouse: "WPS Government Health Admin",
    portal_url: "tricare.mil",
    contact_phone: "1-800-874-2273",
  },
  {
    payer_name: "Molina Healthcare",
    edi_payer_id: "MHIL",
    clearinghouse: "Availity",
    portal_url: "molinahealthcare.com",
    contact_phone: "1-888-275-8750",
  },
  {
    payer_name: "Oscar Health",
    edi_payer_id: "OSCR",
    clearinghouse: "Change Healthcare",
    portal_url: "hioscar.com/providers",
    contact_phone: "1-855-672-2755",
  },
];

const USERS_DEMO = [
  {
    id: "u1",
    full_name: "Dr. Amanda Chen",
    email: "achen@hospital.org",
    role: "admin",
    last_login: "Today, 8:42 AM",
  },
  {
    id: "u2",
    full_name: "Maria S. Rodriguez",
    email: "mrodriguez@hospital.org",
    role: "verification_staff",
    last_login: "Today, 9:15 AM",
  },
  {
    id: "u3",
    full_name: "James T. Lee",
    email: "jlee@hospital.org",
    role: "verification_staff",
    last_login: "Yesterday, 4:30 PM",
  },
  {
    id: "u4",
    full_name: "Summit Medical Group",
    email: "admin@summitmedical.com",
    role: "provider",
    last_login: "Today, 10:00 AM",
  },
  {
    id: "u5",
    full_name: "Valley Health Partners",
    email: "billing@valleyhealth.com",
    role: "provider",
    last_login: "3 days ago",
  },
];

const ROLE_LABELS = {
  admin: "Admin",
  verification_staff: "Verification Staff",
  provider: "Provider",
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
            <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {["R4", "DSTU2", "STU3"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
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
      if (u.role !== "admin") {
        window.location.href = createPageUrl("dashboard");
      }
      return u;
    },
  });
  const [activeSection, setActiveSection] = useState("emr");
  const [payerSearch, setPayerSearch] = useState("");
  const [connectModal, setConnectModal] = useState(null);

  const filteredPayers = PAYERS.filter((p) =>
    p.payer_name.toLowerCase().includes(payerSearch.toLowerCase())
  );

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#eef3ff", fontFamily: "'DM Sans', sans-serif" }}
    >
      <AppHeader
        user={user}
        breadcrumbs={[
          { label: "Dashboard", href: createPageUrl("dashboard") },
          { label: "Settings" },
        ]}
      />

      {connectModal && <ConnectModal emr={connectModal} onClose={() => setConnectModal(null)} />}

      <main className="p-6 max-w-[1400px] mx-auto">
        <h1 className="text-xl font-bold text-slate-800 mb-6">
          Settings <span className="text-xs font-medium text-slate-400 ml-2">Admin Only</span>
        </h1>

        {/* Section Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 w-fit">
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
                    <tr key={p.payer_name} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.payer_name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{p.edi_payer_id}</td>
                      <td className="px-4 py-3 text-slate-600">{p.clearinghouse}</td>
                      <td className="px-4 py-3 text-blue-600">{p.portal_url}</td>
                      <td className="px-4 py-3 text-slate-600">{p.contact_phone}</td>
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
                  {USERS_DEMO.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{u.full_name}</td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor:
                              u.role === "admin"
                                ? "#fef9c3"
                                : u.role === "verification_staff"
                                  ? "#f0fdfa"
                                  : "#eef3ff",
                            color:
                              u.role === "admin"
                                ? "#a16207"
                                : u.role === "verification_staff"
                                  ? "#0f766e"
                                  : "#293682",
                          }}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u.last_login}</td>
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
      </main>
    </div>
  );
}
