import { useState } from "react";
import { Search, X, CheckCircle, AlertTriangle, Wifi, WifiOff, Zap, RefreshCw } from "lucide-react";
import ManualEntryTab from "./ManualEntryTab";

const EHR_SYSTEMS = [
  { name: "Epic", protocol: "FHIR R4", is_connected: true },
  { name: "Athenahealth", protocol: "REST API", is_connected: true },
  { name: "eClinicalWorks", protocol: "FHIR R4", is_connected: true },
  { name: "Cerner / Oracle Health", protocol: "FHIR R4", is_connected: false },
  { name: "NextGen", protocol: "REST API", is_connected: false },
  { name: "DrChrono", protocol: "REST API", is_connected: false },
  { name: "Kareo / Tebra", protocol: "REST API", is_connected: false },
  { name: "AdvancedMD", protocol: "FHIR STU3", is_connected: false },
];

const DUMMY_PATIENTS = [
  {
    name: "Sarah J. Mitchell",
    dob: "03/14/1985",
    mrn: "MRN-00291847",
    source: "Epic",
    payer: "UnitedHealthcare",
    member_id: "UHC-884720193",
    group_number: "GRP-44821",
    plan_type: "PPO",
  },
  {
    name: "Samuel J. Mitchell",
    dob: "09/20/1978",
    mrn: "MRN-00291901",
    source: "Epic",
    payer: "Cigna",
    member_id: "CIG-338881234",
    group_number: "GRP-77001",
    plan_type: "HMO",
  },
  {
    name: "James R. Holloway",
    dob: "07/22/1971",
    mrn: "MRN-00487223",
    source: "Epic",
    payer: "Aetna",
    member_id: "AETNA-562901847",
    group_number: "GRP-77334",
    plan_type: "HMO",
  },
  {
    name: "Linda K. Patel",
    dob: "11/30/1990",
    mrn: "MRN-00512948",
    source: "Epic",
    payer: "Blue Cross Blue Shield",
    member_id: "BCBS-774930281",
    group_number: "GRP-22019",
    plan_type: "PPO",
  },
];

const FOUND_FIELDS = ["Name", "DOB", "Member ID", "Payer", "Group Number", "Plan Type"];
const MISSING_FIELDS = ["CPT Code", "Service Date", "Provider NPI"];

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
            { label: "Client Secret", type: "password", placeholder: "••••••••" },
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
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
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

export default function EmrTab({ onSubmit }) {
  const [selectedEhr, setSelectedEhr] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [connectModal, setConnectModal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [autoPullStatus, setAutoPullStatus] = useState(null); // null | "pulling" | "done"
  const [autoPulledCount, setAutoPulledCount] = useState(0);

  const handleAutoPull = async (_ehr) => {
    setAutoPullStatus("pulling");
    // Simulate pulling pending verifications from EMR
    await new Promise((r) => setTimeout(r, 2200));
    setAutoPulledCount(Math.floor(Math.random() * 8) + 3);
    setAutoPullStatus("done");
  };

  const filteredPatients = searchQuery.trim()
    ? DUMMY_PATIENTS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.mrn.includes(searchQuery)
      )
    : [];

  return (
    <div className="space-y-5">
      {connectModal && <ConnectModal emr={connectModal} onClose={() => setConnectModal(null)} />}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-700 text-sm mb-4">Connected EHR Systems</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EHR_SYSTEMS.map((ehr) => (
            <div
              key={ehr.name}
              className={`rounded-xl border-2 p-3 cursor-pointer transition-all ${selectedEhr?.name === ehr.name ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => ehr.is_connected && setSelectedEhr(ehr)}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: "#293682" }}
                >
                  {ehr.name.charAt(0)}
                </div>
                <span
                  className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ehr.is_connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                >
                  {ehr.is_connected ? (
                    <Wifi className="w-2.5 h-2.5" />
                  ) : (
                    <WifiOff className="w-2.5 h-2.5" />
                  )}
                  {ehr.is_connected ? "Connected" : "Not Connected"}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700">{ehr.name}</p>
              <p className="text-[10px] text-slate-400">{ehr.protocol}</p>
              <div className="mt-2">
                {ehr.is_connected ? (
                  <div className="flex gap-1">
                    <button
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: "#293682" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEhr(ehr);
                      }}
                    >
                      Pull Patient
                    </button>
                    <button
                      className="py-1.5 px-2 rounded-lg text-xs font-bold border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100"
                      title="Auto-pull pending verifications"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEhr(ehr);
                        handleAutoPull(ehr);
                      }}
                    >
                      <Zap className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full py-1.5 rounded-lg text-xs font-bold text-white border border-slate-300 text-slate-600"
                    style={{ backgroundColor: "white", color: "#64748b" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectModal(ehr);
                    }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-pull banner */}
      {autoPullStatus && (
        <div
          className={`rounded-xl border p-4 flex items-center gap-3 ${autoPullStatus === "done" ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"}`}
        >
          {autoPullStatus === "pulling" ? (
            <>
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-700 font-semibold">
                Pulling pending verifications from {selectedEhr?.name}…
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-emerald-700 font-semibold">
                {autoPulledCount} pending verification{autoPulledCount !== 1 ? "s" : ""} pulled from{" "}
                {selectedEhr?.name} and queued for processing.
              </span>
              <button
                onClick={() => setAutoPullStatus(null)}
                className="ml-auto text-emerald-400 hover:text-emerald-600"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {selectedEhr && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 text-sm mb-3">
            Search Patients — {selectedEhr.name}
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name or MRN..."
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"
            />
          </div>

          {filteredPatients.length > 0 && (
            <div className="mt-3 space-y-2">
              {filteredPatients.map((p) => (
                <div
                  key={p.mrn}
                  onClick={() => {
                    setSelectedPatient(p);
                    setShowForm(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedPatient?.mrn === p.mrn ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      DOB: {p.dob} · MRN: {p.mrn} · {p.source}
                    </p>
                  </div>
                  <CheckCircle
                    className={`w-5 h-5 ${selectedPatient?.mrn === p.mrn ? "text-blue-500" : "text-slate-200"}`}
                  />
                </div>
              ))}
            </div>
          )}

          {searchQuery && filteredPatients.length === 0 && (
            <p className="text-slate-400 text-sm mt-3 text-center">
              No patients found — try a different search
            </p>
          )}
        </div>
      )}

      {selectedPatient && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-700 text-sm">
              Data Pulled Successfully — {selectedPatient.name}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Found in EHR
              </p>
              <div className="space-y-1.5">
                {FOUND_FIELDS.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Missing — Need Manual Entry
              </p>
              <div className="space-y-1.5">
                {MISSING_FIELDS.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: "#293682" }}
          >
            Fill Missing Fields →
          </button>
        </div>
      )}

      {showForm && selectedPatient && (
        <div>
          <h3 className="font-bold text-slate-700 text-sm mb-4">Complete Verification Form</h3>
          <ManualEntryTab
            onSubmit={onSubmit}
            prefill={{
              first_name: selectedPatient.name.split(" ")[0],
              last_name: selectedPatient.name.split(" ").slice(1).join(" "),
              dob: selectedPatient.dob,
              payer: selectedPatient.payer,
              member_id: selectedPatient.member_id,
              group_number: selectedPatient.group_number,
              plan_type: selectedPatient.plan_type,
            }}
          />
        </div>
      )}
    </div>
  );
}
