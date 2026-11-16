export function closeOpenDialog(dialog: Pick<HTMLDialogElement, "open" | "close"> | null): void {
  if (dialog?.open) dialog.close();
}
