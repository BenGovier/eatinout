"use client";

import { useState, useEffect } from "react";
import { Button } from "@componentsforadmin/ui/button";
import { Input } from "@componentsforadmin/ui/input";
import { Label } from "@componentsforadmin/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@componentsforadmin/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmationWord?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmationWord = "DELETE",
}: DeleteConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const isConfirmed = inputValue === confirmationWord;

  useEffect(() => {
    if (!open) {
      setInputValue("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[850px] w-full max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label htmlFor="confirmation" className="text-sm text-muted-foreground">
            Type <span className="font-mono font-semibold text-foreground">{confirmationWord}</span> to confirm
          </Label>
          <Input
            id="confirmation"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmationWord}
            className="mt-2"
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
