import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import PAEligibilityCheck from "@/components/priorauth/PAEligibilityCheck.jsx";
import PACaseTracker from "@/components/priorauth/PACaseTracker.jsx";
import { ClipboardList, Plus } from "lucide-react";

export default function PriorAuth() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("tracker"); // "tracker" | "new"
  const navigate = useNavigate();

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const handleCaseCreated = (caseId) => {
    navigate(createPageUrl(`PriorAuthCase?id=${caseId}`));
  };

  return (
    <StaffinglyLayout
      user={user}
      currentPage="prior-auth"
      title="Prior Authorization"
      breadcrumbs={["Prior Auth"]}
    >
      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* Header Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
            <button
              onClick={() => setView("tracker")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === "tracker" ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              style={view === "tracker" ? { backgroundColor: "#293682" } : {}}
            >
              <ClipboardList className="w-4 h-4" /> Case Tracker
            </button>
            <button
              onClick={() => setView("new")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === "new" ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              style={view === "new" ? { backgroundColor: "#293682" } : {}}
            >
              <Plus className="w-4 h-4" /> Start Prior Auth
            </button>
          </div>
        </div>

        {view === "tracker" && <PACaseTracker user={user} onStartNew={() => setView("new")} />}

        {view === "new" && <PAEligibilityCheck user={user} onCaseCreated={handleCaseCreated} />}
      </div>
    </StaffinglyLayout>
  );
}
