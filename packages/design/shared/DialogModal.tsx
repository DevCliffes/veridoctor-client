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

  const handleSave = async () => {
    await onSave();
    setOpen(false);
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
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DialogModal };
