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
  onSave: any;
  children?: React.ReactNode;
  // saveStatus: {
  //   success: boolean;
  //   message?: string;
  // };
};
/**
 * dialog modal
 * @param props - { title - dialog title,
 * description - description for the dialog,
 *  trigger - the content to trigger the dialog,
 * onSave - function to be called when onsave is called,
 *  children -  the dialog content }
 * @title - the dialog title
 * @returns
 */
function DialogModal({
  title,
  description,
  trigger,
  onSave,
  children,
  // saveStatus,
}: DialogContent) {
  return (
    <Dialog>
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
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DialogModal };
