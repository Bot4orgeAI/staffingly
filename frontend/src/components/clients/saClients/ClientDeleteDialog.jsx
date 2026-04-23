import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ClientDeleteDialog({ client, deleting, onConfirm, onOpenChange }) {
  return (
    <AlertDialog
      open={Boolean(client)}
      onOpenChange={(open) => {
        if (!open && !deleting) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Client</AlertDialogTitle>
          <AlertDialogDescription>
            Delete {client?.practiceName || client?.name}? This will remove the client record from
            the backend.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700"
            disabled={deleting}
            onClick={async (event) => {
              event.preventDefault();
              if (!client) return;
              await onConfirm(client);
            }}
          >
            {deleting ? "Deleting..." : "Delete Client"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
