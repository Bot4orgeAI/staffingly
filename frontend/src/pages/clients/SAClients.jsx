import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Building2, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import AppSelect from "@/components/ui/app-select";
import ClientCard from "@/components/clients/saClients/ClientCard";
import ClientDeleteDialog from "@/components/clients/saClients/ClientDeleteDialog";
import ClientDrawer from "@/components/clients/saClients/ClientDrawer";
import { STATUS_OPTIONS } from "@/components/clients/saClients/constants";
import { normalizeClient } from "@/components/clients/saClients/utils";

const CLIENTS_QUERY_KEY = "sa-clients";
const AUTH_QUERY_KEY = "sa-clients-auth";

export default function SAClients() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [drawer, setDrawer] = useState(null);
  const [clientPendingDelete, setClientPendingDelete] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  const { data: user, isError: authError } = useQuery({
    queryKey: [AUTH_QUERY_KEY],
    queryFn: async () => {
      const authUser = await api.auth.me();
      return { ...authUser, role: authUser.role || "super_admin" };
    },
    retry: false,
  });

  const {
    data: clients = [],
    isLoading: loadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: [CLIENTS_QUERY_KEY, debouncedSearch, filterStatus],
    queryFn: async () => {
      const response = await api.clients.list({
        page: 1,
        limit: 100,
        search: debouncedSearch || undefined,
        status: filterStatus === "all" ? undefined : filterStatus,
      });
      const data = Array.isArray(response?.data) ? response.data : [];
      return data.map(normalizeClient);
    },
    enabled: Boolean(user),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ clientId, payload }) => {
      if (clientId) {
        return api.clients.update(clientId, payload);
      }
      return api.clients.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CLIENTS_QUERY_KEY] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientId) => api.clients.delete(clientId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CLIENTS_QUERY_KEY] });
    },
  });

  const listError = useMemo(
    () => deleteMutation.error?.message || clientsError?.message || "",
    [clientsError?.message, deleteMutation.error?.message]
  );

  const isEmptyState = useMemo(
    () => !loadingClients && !listError && clients.length === 0,
    [clients.length, listError, loadingClients]
  );

  const handleSave = useCallback(
    async ({ clientId, payload }) => {
      await saveMutation.mutateAsync({ clientId, payload });
    },
    [saveMutation]
  );

  const handleDelete = useCallback(
    async (client) => {
      await deleteMutation.mutateAsync(client.id);
      setClientPendingDelete(null);
    },
    [deleteMutation]
  );

  const handleDeleteDialogChange = useCallback(() => {
    setClientPendingDelete(null);
  }, []);

  const handleCreateClient = useCallback(() => {
    setDrawer("add");
  }, []);

  const handleEditClient = useCallback((client) => {
    setDrawer(client);
  }, []);

  useEffect(() => {
    if (!authError) return;
    api.auth.redirectToLogin();
  }, [authError]);

  useEffect(() => {
    const hasOpenForm = drawer !== null || clientPendingDelete !== null;
    const previousOverflow = document.body.style.overflow;

    if (hasOpenForm) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [clientPendingDelete, drawer]);

  return (
    <StaffinglyLayout
      user={user}
      currentPage="sa-clients"
      title="Client Registry"
      breadcrumbs={["Admin", "Clients"]}
    >
      <ClientDeleteDialog
        client={clientPendingDelete}
        deleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        onOpenChange={handleDeleteDialogChange}
      />

      <AnimatePresence mode="wait">
        {drawer !== null && (
          <ClientDrawer
            key={drawer === "add" ? "new" : drawer.id}
            client={drawer === "add" ? null : drawer}
            onClose={() => setDrawer(null)}
            onSubmit={handleSave}
            saving={saveMutation.isPending}
            saveError={saveMutation.error?.message || ""}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto flex min-h-[calc(100vh-230px)] max-w-[1400px] flex-col space-y-5">
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client name, practice, or email..."
                className="w-72 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none"
              />
            </div>
            <AppSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              options={STATUS_OPTIONS}
              triggerClassName="h-9 w-[170px] rounded-xl px-3 py-2 text-xs focus:ring-0"
            />
          </div>

          <button
            onClick={handleCreateClient}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: "#0a7e87" }}
          >
            <Plus className="h-4 w-4" /> Onboard Client
          </button>
        </div>

        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
            isEmptyState ? "flex-1" : ""
          }`}
        >
          {!loadingClients && listError ? (
            <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              {listError}
            </div>
          ) : null}

          {loadingClients ? (
            <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading clients...
            </div>
          ) : null}

          {isEmptyState ? (
            <div className="sm:col-span-2 lg:col-span-3 flex min-h-[calc(100vh-320px)] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "#eef3ff" }}
              >
                <Building2 className="h-8 w-8" style={{ color: "#293682" }} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No clients found</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                No backend client records match the current search or status filter.
              </p>
              <button
                onClick={handleCreateClient}
                className="mt-6 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                style={{ backgroundColor: "#0a7e87" }}
              >
                <Plus className="h-4 w-4" /> Onboard Client
              </button>
            </div>
          ) : null}

          {!loadingClients &&
            !listError &&
            clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                deleting={deleteMutation.isPending && clientPendingDelete?.id === client.id}
                onEdit={handleEditClient}
                onDelete={setClientPendingDelete}
              />
            ))}
        </div>
      </div>
    </StaffinglyLayout>
  );
}
