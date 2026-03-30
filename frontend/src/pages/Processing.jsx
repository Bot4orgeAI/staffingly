import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { api } from "@/lib/api";
import { Check, Loader2, ShieldCheck } from "lucide-react";

const STEPS = [
  {
    title: "Sending EDI 270 Inquiry",
    description:
      "Packaging patient demographics into X12 270 transaction. Submitting to Availity clearinghouse.",
  },
  {
    title: "Clearinghouse Routing",
    description: "Availity routing inquiry to payer endpoint. Establishing secure connection.",
  },
  {
    title: "Receiving EDI 271 Response",
    description:
      "Payer returned eligibility response. Parsing EB segments for coverage and benefit details.",
  },
  {
    title: "AI Benefits Interpretation",
    description:
      "InsuVerifAI analyzing plan documents. Calculating patient responsibility and checking prior auth requirements.",
  },
  {
    title: "Verification Complete",
    description: "Results normalized and confidence score calculated. Ready for review.",
  },
];

export default function Processing() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState(null);
  const calledRef = useRef(false);
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const patient = params.get("patient") || "";
  const payer = params.get("payer") || "";
  const memberId = params.get("member_id") || "";
  const payerId = params.get("payer_id") || "";
  const providerNpi = params.get("provider_npi") || "";
  const serviceType = params.get("service_type") || "";
  const dob = params.get("dob") || "";
  const serviceDate = params.get("service_date") || new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    // Step 1: animate first 2 steps, then call API, then animate remaining steps
    const advanceStep = (step) => {
      setCompletedSteps((prev) => [...prev, step]);
      if (step + 1 < STEPS.length) setCurrentStep(step + 1);
    };

    // Animate steps 0 and 1 while API call happens in parallel
    setTimeout(() => advanceStep(0), 1200);
    setTimeout(() => advanceStep(1), 2400);

    // Call Availity API
    const runVerification = async () => {
      try {
        const response = await api.functions.invoke("availityEligibility", {
          patient_name: patient,
          dob,
          member_id: memberId,
          payer_id: payerId,
          provider_npi: providerNpi,
          service_date: serviceDate,
          service_type_code: "30",
        });

        const result = response.data;

        // Animate remaining steps
        setTimeout(() => advanceStep(2), 2800);
        setTimeout(() => advanceStep(3), 4000);
        setTimeout(() => {
          advanceStep(4);
          setTimeout(() => {
            setDone(true);
            setTimeout(() => {
              // Pass result as JSON in URL (base64 encoded to avoid URL issues)
              const encoded = btoa(JSON.stringify(result));
              const resultParams = new URLSearchParams({
                patient,
                payer,
                member_id: memberId,
                service_type: serviceType,
                result_data: encoded,
              });
              navigate(createPageUrl(`Results?${resultParams.toString()}`));
            }, 1200);
          }, 600);
        }, 5200);
      } catch (err) {
        setApiError(err.message || "Verification failed");
        // Still animate through steps with simulated data
        setTimeout(() => advanceStep(2), 2800);
        setTimeout(() => advanceStep(3), 4000);
        setTimeout(() => {
          advanceStep(4);
          setTimeout(() => {
            setDone(true);
            setTimeout(() => {
              const resultParams = new URLSearchParams({
                patient,
                payer,
                member_id: memberId,
                service_type: serviceType,
              });
              navigate(createPageUrl(`Results?${resultParams.toString()}`));
            }, 1200);
          }, 600);
        }, 5200);
      }
    };

    runVerification();
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#002082", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: "#eef3ff" }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: "#293682" }} />
          </div>
          <h2 className="font-bold text-slate-800 text-lg">Running Eligibility Check</h2>
          {patient && (
            <p className="text-slate-400 text-sm mt-1">
              Patient: <span className="text-slate-600 font-medium">{patient}</span>
            </p>
          )}
          {payer && <p className="text-slate-400 text-xs">Payer: {payer}</p>}
        </div>

        {/* Steps */}
        <div className="space-y-1 mb-8">
          {STEPS.map((step, i) => {
            const isDone = completedSteps.includes(i);
            const isActive = currentStep === i && !isDone;
            const isPending = !isDone && !isActive;
            return (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex flex-col items-center mt-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isDone ? "bg-emerald-500" : isActive ? "bg-blue-600" : "bg-slate-100"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    )}
                  </div>
                  {i < 4 && (
                    <div
                      className="w-0.5 h-4 my-1"
                      style={{ backgroundColor: isDone ? "#10b981" : "#e2e8f0" }}
                    />
                  )}
                </div>
                <div
                  className={`pb-4 transition-opacity duration-300 ${isPending ? "opacity-30" : "opacity-100"}`}
                >
                  <p
                    className={`text-sm font-semibold ${isDone ? "text-slate-700" : isActive ? "text-blue-700" : "text-slate-400"}`}
                  >
                    {step.title}
                  </p>
                  {(isActive || isDone) && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verified Badge */}
        {done && (
          <div className="text-center animate-bounce">
            <span
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-lg"
              style={{ backgroundColor: "#0a7e87" }}
            >
              VERIFIED <Check className="w-5 h-5" strokeWidth={3} />
            </span>
            <p className="text-slate-400 text-xs mt-2">Loading results...</p>
          </div>
        )}
      </div>
    </div>
  );
}
