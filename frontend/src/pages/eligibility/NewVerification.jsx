import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/lib/utils/page";
import { useAuthUserQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import ManualEntryTab from "@/components/insuverif/ManualEntryTab";
import UploadTab from "@/components/insuverif/UploadTab";
import EmrTab from "@/components/insuverif/EmrTab.jsx";
import BulkVerifyTab from "@/components/insuverif/BulkVerifyTab";

const TABS = ["Manual Entry", "Upload Document", "Bulk Verify", "EMR / EHR"];

export default function NewVerification() {
  const { data: user } = useAuthUserQuery();
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();

  const handleRunVerification = (formData) => {
    const params = new URLSearchParams({
      patient: formData.patient_name || `${formData.first_name} ${formData.last_name}`,
      payer: formData.payer || "",
      member_id: formData.member_id || "",
      service_type: formData.service_type || "",
    });
    navigate(createPageUrl(`Processing?${params.toString()}`));
  };

  return (
    <StaffinglyLayout
      user={user}
      currentPage="new-verification"
      title="New Eligibility Verification"
      breadcrumbs={["Eligibility", "New Check"]}
    >
      <div>
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 w-fit">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === i ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              style={activeTab === i ? { backgroundColor: "#293682" } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && <ManualEntryTab onSubmit={handleRunVerification} />}
        {activeTab === 1 && <UploadTab onSubmit={handleRunVerification} />}
        {activeTab === 2 && <BulkVerifyTab />}
        {activeTab === 3 && <EmrTab onSubmit={handleRunVerification} />}
      </div>
    </StaffinglyLayout>
  );
}
