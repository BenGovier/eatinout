"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ─── Add / Edit Tag Dialog ───────────────────────────────────────────────────

interface TagFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  initialName?: string
  onSave: (name: string) => void
}

export function TagFormDialog({
  open,
  onOpenChange,
  mode,
  initialName = "",
  onSave,
}: TagFormDialogProps) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  const handleSave = () => {
    const trimmed = name.trim()
    if (trimmed) {
      onSave(trimmed)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === "add" ? "Add New Tag" : "Edit Tag"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === "add"
              ? "Enter a name for the new tag. Tags help users discover restaurant offers."
              : "Update the tag name below."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <label htmlFor="tag-name" className="text-sm font-medium text-foreground">
            Tag Name
          </label>
          <Input
            id="tag-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sushi, Vegan, Brunch..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave()
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mode === "add" ? "Add Tag" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirmation ─────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tagName: string
  count?: number // for bulk delete
  onConfirm: () => void
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  tagName,
  count,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const isBulk = count !== undefined && count > 1
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            {isBulk ? `Delete ${count} tags?` : `Delete "${tagName}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulk
              ? `This will permanently remove ${count} selected tags and all their offer associations. This action cannot be undone.`
              : `This will permanently remove the tag "${tagName}" and all its offer associations. This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Remove Tag from Offer Confirmation ──────────────────────────────────────

interface RemoveFromOfferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tagName: string
  offerTitle: string
  restaurantName: string
  onConfirm: () => void
}

export function RemoveFromOfferDialog({
  open,
  onOpenChange,
  tagName,
  offerTitle,
  restaurantName,
  onConfirm,
}: RemoveFromOfferDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Remove tag from offer?</AlertDialogTitle>
          <AlertDialogDescription>
            {`Remove tag "${tagName}" from "${offerTitle}" by ${restaurantName}? The tag will still exist but will no longer be associated with this offer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
