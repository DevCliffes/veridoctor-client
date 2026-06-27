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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
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
