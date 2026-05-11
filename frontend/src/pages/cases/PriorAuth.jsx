import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { getWorkflowContext } from "@/lib/utils/workflow";
import PAEligibilityCheck from "@/components/priorauth/PAEligibilityCheck.jsx";
import PACaseTracker from "@/components/priorauth/PACaseTracker.jsx";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

export default function PriorAuth({ embedded: _embedded = false }) {
  const workflowContext = useMemo(() => getWorkflowContext(window.location.search), []);
  const hasWorkflowPrefill = Boolean(
    workflowContext.patientName || workflowContext.memberId || workflowContext.payer
  );
  const [view, setView] = useState(
    workflowContext.intent === "prior-auth" || hasWorkflowPrefill ? "new" : "tracker"
  );
  const navigate = useNavigate();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (view === "new") {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [view]);

  const handleCaseCreated = (caseId) => {
    navigate(createPageUrl(`PriorAuthCase?id=${caseId}`));
  };

  const content = (
    <>
      <div className="max-w-[1400px] mx-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Prior Authorization</h1>
              <p className="mt-2 text-sm text-slate-500">
                Review existing cases or start a new prior auth with eligibility context carried
                forward.
              </p>
            </div>
            {view === "tracker" ? (
              <button
                type="button"
                onClick={() => setView("new")}
                className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white"
                style={{ backgroundColor: "#293682" }}
              >
                <Plus className="h-4 w-4" />
                Start New Case
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setView("tracker")}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Cases
              </button>
            )}
          </div>
        </div>

        {hasWorkflowPrefill ? (
          <div className="rounded-2xl border border-[#f6b037]/30 bg-[#fff9ec] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b45309]">
              Eligibility-To-PA Handoff
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="rounded-full bg-white px-3 py-1">Patients</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <span className="rounded-full bg-white px-3 py-1">Eligibility</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-[#293682]">Prior Auth</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Starting a prior auth with the same patient and coverage context keeps the workflow
              aligned with the PRD and avoids duplicate data entry.
            </p>
          </div>
        ) : null}

        <PACaseTracker user={null} onStartNew={() => setView("new")} />
      </div>

      {view === "new" && (
        <PAEligibilityCheck
          user={null}
          onCaseCreated={handleCaseCreated}
          workflowContext={workflowContext}
          onClose={() => setView("tracker")}
        />
      )}
    </>
  );

  return content;
}
