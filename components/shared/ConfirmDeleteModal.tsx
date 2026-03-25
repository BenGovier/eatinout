// "use client"

// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { Button } from "@/components/ui/button"
// import { toast } from "react-toastify"
// import React from "react"

// interface ConfirmDeleteModalProps {
//   open: boolean
//   onClose: () => void
//   fileUrl: string | null
//   deleteFromCloud: (url: string) => Promise<void>
//   onDeleted?: () => void
//   title?: string
//   description?: string
// }

// const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
//   open,
//   onClose,
//   fileUrl,
//   deleteFromCloud,
//   onDeleted,
//   title = "Confirm Deletion",
//   description = "Are you sure you want to permanently delete this file?",
// }) => {
//   const handleDelete = async () => {
//     if (!fileUrl) return
//     try {
//       if (!fileUrl.includes("raffilybusiness")) {
//         await deleteFromCloud(fileUrl)
//       }
//       toast.success("File deleted successfully")
//       onDeleted?.()
//     } catch (error) {
//       console.error("Delete error:", error)
//       toast.error("Failed to delete the file")
//     } finally {
//       onClose()
//     }
//   }

//   return (
//     <Dialog open={open} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle>{title}</DialogTitle>
//           <DialogDescription>{description}</DialogDescription>
//         </DialogHeader>

//         <DialogFooter>
//           <Button variant="outline" onClick={onClose}>
//             Cancel
//           </Button>
//           <Button variant="destructive" onClick={handleDelete}>
//             Delete
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   )
// }

// export default ConfirmDeleteModal
"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import React from "react"

interface ConfirmDeleteModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title?: string
  description?: string
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  description = "Are you sure you want to permanently delete this file?",
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDeleteModal