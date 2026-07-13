import * as React from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components";

export type DialogContent = {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  onSave: () => Promise<void> | void;
  children?: React.ReactNode;
};

function DialogModal({
  title,
  description,
  trigger,
  onSave,
  children,
}: DialogContent) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const hasSubmitted = React.useRef(false);

  // Reset guard whenever modal opens fresh
  React.useEffect(() => {
    if (open) {
      hasSubmitted.current = false;
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    // Hard guard — block any second call even before state updates
    if (hasSubmitted.current || saving) return;
    hasSubmitted.current = true;
    setSaving(true);
    try {
      await onSave();
      setOpen(false);
    } catch {
      // If onSave throws, reset so provider can retry
      hasSubmitted.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="h-fit px-2 py-1 rounded-md flex gap-1 items-center bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer">
        {trigger}
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85vh] p-0 gap-0">
        {/* Scrollable region — header + form content. Capped at 85vh minus
            the footer's own height, so on mobile (where the dialog is
            taller than the viewport) users can scroll to reach fields
            and the Save/Cancel buttons below instead of them being cut
            off with no way to reach them. */}
        <div className="overflow-y-auto px-6 pt-6 pb-2 flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
        </div>
        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <DialogClose className="bg-secondary px-4 rounded-md text-secondary-foreground shadow-xs hover:bg-secondary/80 cursor-pointer">
            cancel
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DialogModal };
