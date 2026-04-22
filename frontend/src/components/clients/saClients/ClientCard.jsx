import { memo } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle, Edit2, Trash2 } from "lucide-react";
import { createPageUrl } from "@/lib/utils/page";
import { STATUS_STYLES } from "@/components/clients/saClients/constants";
import { formatDate } from "@/components/clients/saClients/utils";

function ClientCard({ client, deleting, onEdit, onDelete }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: "#eef3ff" }}
          >
            <Building2 className="h-5 w-5" style={{ color: "#293682" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{client.practiceName || client.name}</p>
            <p className="text-xs text-slate-400">
              {client.contactName || client.name || "No contact assigned"}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            STATUS_STYLES[client.status] || STATUS_STYLES.ONBOARDING
          }`}
        >
          {client.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-slate-500">
        <p>
          NPI: <span className="font-mono text-slate-700">{client.npi || "Not provided"}</span>
        </p>
        <p>
          EMR: <span className="text-slate-700">{client.emrSystem || "Not provided"}</span>
        </p>
        <p>
          Contact:{" "}
          <span className="text-slate-700">
            {client.contactEmail || client.contactPhone || "Not provided"}
          </span>
        </p>
        <p>
          Onboarded: <span className="text-slate-700">{formatDate(client.onboardedAt)}</span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs">
        <div>
          <p className="text-slate-400">Specialists</p>
          <p className="mt-1 font-semibold text-slate-800">{client.specialistsCount}</p>
        </div>
        <div>
          <p className="text-slate-400">Prior Auth Cases</p>
          <p className="mt-1 font-semibold text-slate-800">{client.priorAuthCasesCount}</p>
        </div>
        <div>
          <p className="text-slate-400">Eligibility Checks</p>
          <p className="mt-1 font-semibold text-slate-800">{client.eligibilityChecksCount}</p>
        </div>
        <div>
          <p className="text-slate-400">Setup</p>
          <p className="mt-1 font-semibold text-slate-800">
            {client.cloudStorageType ? client.cloudStorageType.replaceAll("_", " ") : "No storage"}
          </p>
        </div>
      </div>

      <div className="mt-auto flex gap-2 pt-4">
        <button
          onClick={() => onEdit(client)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50"
        >
          <Edit2 className="h-3 w-3" /> Edit
        </button>
        <Link to={createPageUrl(`client-detail?id=${client.id}`)} className="flex-1">
          <button
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white"
            style={{ backgroundColor: "#293682" }}
          >
            <CheckCircle className="h-3 w-3" /> View Details
          </button>
        </Link>
        <button
          onClick={() => onDelete(client)}
          disabled={deleting}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default memo(ClientCard);
