import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Download, Plus, Settings, Loader2, AlertTriangle, Edit2, X } from "lucide-react";

const ALLOWED_ROLES = ["finance_admin", "super_admin"];
const CASE_TYPES = [
  { key: "standard_prior_auth", label: "Standard Prior Auth" },
  { key: "urgent_prior_auth", label: "Urgent Prior Auth" },
  { key: "eligibility_check", label: "Eligibility Check" },
  { key: "appeal_filing", label: "Appeal Filing" },
  { key: "peer_to_peer", label: "Peer-to-Peer" },
];

function getPayPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
    label: start.toLocaleString("default", { month: "long", year: "numeric" }),
  };
}

function countCaseType(cases, type, periodStart, periodEnd) {
  return cases.filter((c) => {
    if (!["Approved", "Denied", "Closed"].includes(c.status)) return false;
    const d = new Date(c.updated_date || c.created_date);
    const isInPeriod = d >= new Date(periodStart) && d <= new Date(periodEnd + "T23:59:59");
    if (type === "standard_prior_auth")
      return (
        isInPeriod && c.urgency !== "Urgent" && !c.appeal_submitted_at && !c.p2p_physician_name
      );
    if (type === "urgent_prior_auth") return isInPeriod && c.urgency === "Urgent";
    if (type === "appeal_filing") return isInPeriod && c.appeal_submitted_at;
    if (type === "peer_to_peer") return isInPeriod && c.p2p_physician_name;
    return false;
  }).length;
}

export default function FAPayroll() {
  const [user, setUser] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [rates, setRates] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("payroll");
  const [configModal, setConfigModal] = useState(null); // specialist object
  const [configRates, setConfigRates] = useState({});
  const [savingRates, setSavingRates] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null); // specialist object
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [savingAdj, setSavingAdj] = useState(false);
  const [generating, setGenerating] = useState(false);

  const period = getPayPeriod();

  useEffect(() => {
    api.auth
      .me()
      .then(async (u) => {
        setUser(u);
        if (!ALLOWED_ROLES.includes(u.role)) {
          setLoading(false);
          return;
        }
        const [sData, cData, rData, aData] = await Promise.all([
          api.entities.StaffinglyUser.list(),
          api.entities.PriorAuthCase.list(),
          api.entities.PayrollRate.list(),
          api.entities.PayrollAdjustment.filter({ pay_period_start: period.start }),
        ]);
        setSpecialists(
          sData.filter((s) =>
            ["staffingly_specialist", "staffingly_supervisor", "staffingly_admin"].includes(s.role)
          )
        );
        setAllCases(cData);
        setRates(rData);
        setAdjustments(aData);
        setLoading(false);
      })
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const getRateForSpecialist = (specId, caseType) => {
    const r = rates.find((r) => r.specialist_id === specId && r.case_type === caseType);
    return r?.rate_per_case || 0;
  };

  const calcEarnings = (specId, specCases) => {
    let total = 0;
    const breakdown = {};
    CASE_TYPES.forEach((ct) => {
      const count =
        ct.key === "eligibility_check"
          ? 0
          : countCaseType(specCases, ct.key, period.start, period.end);
      const rate = getRateForSpecialist(specId, ct.key);
      const earned = count * rate;
      breakdown[ct.key] = { count, rate, earned };
      total += earned;
    });
    const adj = adjustments
      .filter((a) => a.specialist_id === specId)
      .reduce((s, a) => s + (a.amount || 0), 0);
    return { breakdown, baseTotal: total, adjustments: adj, total: total + adj };
  };

  const openConfigModal = (spec) => {
    const specRates = {};
    CASE_TYPES.forEach((ct) => {
      specRates[ct.key] = getRateForSpecialist(spec.id, ct.key);
    });
    setConfigRates(specRates);
    setConfigModal(spec);
  };

  const saveRates = async () => {
    setSavingRates(true);
    await Promise.all(
      Object.entries(configRates).map(async ([caseType, rate]) => {
        const existing = rates.find(
          (r) => r.specialist_id === configModal.id && r.case_type === caseType
        );
        const payload = {
          specialist_id: configModal.id,
          specialist_name: configModal.full_name || configModal.email,
          case_type: caseType,
          rate_per_case: parseFloat(rate) || 0,
          effective_date: new Date().toISOString().split("T")[0],
          set_by: user.email,
        };
        if (existing) await api.entities.PayrollRate.update(existing.id, payload);
        else await api.entities.PayrollRate.create(payload);
      })
    );
    const rData = await api.entities.PayrollRate.list();
    setRates(rData);
    setSavingRates(false);
    setConfigModal(null);
  };

  const saveAdjustment = async () => {
    if (!adjustNotes.trim() || adjustAmount === "") return;
    setSavingAdj(true);
    await api.entities.PayrollAdjustment.create({
      specialist_id: adjustModal.id,
      specialist_name: adjustModal.full_name || adjustModal.email,
      pay_period_start: period.start,
      pay_period_end: period.end,
      amount: parseFloat(adjustAmount),
      reason: adjustNotes,
      added_by: user.email,
      added_at: new Date().toISOString(),
    });
    const aData = await api.entities.PayrollAdjustment.filter({ pay_period_start: period.start });
    setAdjustments(aData);
    setSavingAdj(false);
    setAdjustModal(null);
    setAdjustAmount("");
    setAdjustNotes("");
  };

  const generateCSV = async () => {
    setGenerating(true);
    const rows = [
      [
        "Name",
        "Role",
        ...CASE_TYPES.map((ct) => `${ct.label} Count`),
        ...CASE_TYPES.map((ct) => `${ct.label} Rate`),
        ...CASE_TYPES.map((ct) => `${ct.label} Earned`),
        "Adjustments",
        "Total Earnings",
        "Pay Period",
      ],
    ];
    specialists.forEach((s) => {
      const specCases = allCases.filter((c) => c.assigned_specialist_id === s.id);
      const earnings = calcEarnings(s.id, specCases);
      const row = [
        s.full_name || s.email,
        s.role,
        ...CASE_TYPES.map((ct) => earnings.breakdown[ct.key]?.count || 0),
        ...CASE_TYPES.map((ct) => `$${earnings.breakdown[ct.key]?.rate || 0}`),
        ...CASE_TYPES.map((ct) => `$${(earnings.breakdown[ct.key]?.earned || 0).toFixed(2)}`),
        `$${earnings.adjustments.toFixed(2)}`,
        `$${earnings.total.toFixed(2)}`,
        `${period.start} to ${period.end}`,
      ];
      rows.push(row);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Payroll_${period.start}_${period.end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setGenerating(false);
  };

  if (loading)
    return (
      <StaffinglyLayout
        user={user}
        currentPage="fa-payroll"
        title="Payroll"
        breadcrumbs={["Payroll"]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      </StaffinglyLayout>
    );

  if (!ALLOWED_ROLES.includes(user?.role))
    return (
      <StaffinglyLayout
        user={user}
        currentPage="fa-payroll"
        title="Payroll"
        breadcrumbs={["Payroll"]}
      >
        <div className="text-center p-16">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
          <p className="text-slate-500 mt-2">
            Payroll data is restricted to Finance Admin and Super Admin only.
          </p>
        </div>
      </StaffinglyLayout>
    );

  const TABS = [
    { key: "payroll", label: "Payroll Summary" },
    { key: "rates", label: "Pay Rate Config" },
  ];

  return (
    <StaffinglyLayout
      user={user}
      currentPage="fa-payroll"
      title="Payroll Management"
      breadcrumbs={["Payroll"]}
    >
      <div className="max-w-[1300px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Payroll Management</h1>
            <p className="text-sm text-slate-500">
              Pay period: <strong>{period.label}</strong> ({period.start} — {period.end})
            </p>
            <p className="text-xs text-red-600 font-semibold mt-0.5">
              🔒 Restricted — Finance Admin & Super Admin only
            </p>
          </div>
          <button
            onClick={generateCSV}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: "#293682" }}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Generate Payroll CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.key ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
              style={activeTab === t.key ? { backgroundColor: "#b45309" } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Payroll Summary Table */}
        {activeTab === "payroll" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[
                      "Specialist",
                      "Role",
                      "Cases Completed",
                      "Base Earnings",
                      "Adjustments",
                      "Total",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specialists.map((s) => {
                    const specCases = allCases.filter((c) => c.assigned_specialist_id === s.id);
                    const earnings = calcEarnings(s.id, specCases);
                    const totalCompleted = Object.values(earnings.breakdown).reduce(
                      (sum, b) => sum + b.count,
                      0
                    );
                    return (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {s.full_name || s.email}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {s.role.replace("staffingly_", "")}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">{totalCompleted}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          ${earnings.baseTotal.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-semibold ${earnings.adjustments >= 0 ? "text-emerald-700" : "text-red-600"}`}
                          >
                            {earnings.adjustments >= 0 ? "+" : ""}${earnings.adjustments.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-lg" style={{ color: "#b45309" }}>
                          ${earnings.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openConfigModal(s)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                            >
                              <Settings className="w-3 h-3" /> Rates
                            </button>
                            <button
                              onClick={() => setAdjustModal(s)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Adjust
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
        )}

        {/* Rate Config Tab */}
        {activeTab === "rates" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Pay Rate Configuration</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click a specialist to configure their per-case-type rates.
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {specialists.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-semibold text-slate-800">{s.full_name || s.email}</p>
                    <div className="flex gap-3 mt-1">
                      {CASE_TYPES.map((ct) => (
                        <span key={ct.key} className="text-[10px] text-slate-500">
                          {ct.label.split(" ").slice(-1)[0]}:{" "}
                          <strong className="text-slate-700">
                            ${getRateForSpecialist(s.id, ct.key)}
                          </strong>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => openConfigModal(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Edit2 className="w-3 h-3" /> Configure
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rate Config Modal */}
      {configModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">
                Pay Rates — {configModal.full_name || configModal.email}
              </h3>
              <button onClick={() => setConfigModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              {CASE_TYPES.map((ct) => (
                <div key={ct.key} className="flex items-center gap-3">
                  <label className="text-sm text-slate-700 flex-1">{ct.label}</label>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                    <span className="px-3 py-2 bg-slate-50 text-slate-500 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={configRates[ct.key] || ""}
                      onChange={(e) => setConfigRates((r) => ({ ...r, [ct.key]: e.target.value }))}
                      className="w-20 px-2 py-2 text-sm text-right focus:outline-none"
                    />
                    <span className="px-2 py-2 bg-slate-50 text-slate-400 text-xs">/case</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfigModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={saveRates}
                disabled={savingRates}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: "#b45309" }}
              >
                {savingRates ? "Saving…" : "Save Rates"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">
                Add Adjustment — {adjustModal.full_name || adjustModal.email}
              </h3>
              <button onClick={() => setAdjustModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount * (negative for deduction)
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <span className="px-3 py-2.5 bg-slate-50 text-slate-500 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                    placeholder="e.g. 50.00 or -25.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Reason * (required)
                </label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe the reason for this adjustment…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setAdjustModal(null);
                  setAdjustAmount("");
                  setAdjustNotes("");
                }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={saveAdjustment}
                disabled={!adjustNotes.trim() || adjustAmount === "" || savingAdj}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: "#293682" }}
              >
                {savingAdj ? "Saving…" : "Add Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffinglyLayout>
  );
}
