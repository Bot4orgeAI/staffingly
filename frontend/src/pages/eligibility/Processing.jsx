import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function Processing() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#002082", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: "#eef3ff" }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: "#293682" }} />
          </div>
          <h2 className="font-bold text-slate-800 text-lg">Eligibility Processing Updated</h2>
          <p className="text-slate-500 text-sm mt-2">
            Eligibility checks now run inside the verification page so the UI can reflect the real
            request state instead of a simulated workflow timeline.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">What changed</p>
          <p className="mt-2">
            The old screen advanced through fixed, frontend-only status messages. That made it look
            like we had detailed live backend telemetry when we really only had a single request
            and response. The verification page now shows the actual states the frontend knows.
          </p>
        </div>

        <Link
          to={createPageUrl("new-verification")}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#293682]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to eligibility verification
        </Link>
      </div>
    </div>
  );
}
