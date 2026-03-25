"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Unlink } from "lucide-react"
import { RemoveFromOfferDialog } from "./tag-dialogs"

interface OfferAssociation {
  associationTagId: string
  associationOfferId: string
  offerId: string
  offerTitle: string
  offerStatus: "active" | "expired"
  restaurantId: string
  restaurantName: string
}

interface ExpandedOffersProps {
  tagName: string
  associations: OfferAssociation[]
  onRemoveAssociation: (tagId: string, offerId: string) => void
}

export function ExpandedOffers({
  tagName,
  associations,
  onRemoveAssociation,
}: ExpandedOffersProps) {
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean
    association: OfferAssociation | null
  }>({ open: false, association: null })

  if (associations.length === 0) {
    return (
      <div className="px-10 py-4 text-sm text-muted-foreground">
        No offers are currently associated with this tag.
      </div>
    )
  }

  return (
    <>
      <div className="bg-muted/40 px-10 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Offers tagged with &ldquo;{tagName}&rdquo; ({associations.length})
        </p>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Restaurant
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Offer
                </TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-[100px] text-right text-xs font-medium text-muted-foreground">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {associations.map((assoc) => (
                <TableRow
                  key={`${assoc.associationTagId}-${assoc.offerId}`}
                  className={assoc.offerStatus === "expired" ? "opacity-50" : ""}
                >
                  <TableCell className="text-sm font-medium text-foreground">
                    {assoc.restaurantName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {assoc.offerTitle}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={assoc.offerStatus === "active" ? "default" : "secondary"}
                      className={
                        assoc.offerStatus === "active"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      }
                    >
                      {assoc.offerStatus === "active" ? "Active" : "Expired"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        setRemoveDialog({ open: true, association: assoc })
                      }
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {removeDialog.association && (
        <RemoveFromOfferDialog
          open={removeDialog.open}
          onOpenChange={(open) =>
            setRemoveDialog((prev) => ({ ...prev, open }))
          }
          tagName={tagName}
          offerTitle={removeDialog.association.offerTitle}
          restaurantName={removeDialog.association.restaurantName}
          onConfirm={() => {
            onRemoveAssociation(
              removeDialog.association!.associationTagId,
              removeDialog.association!.associationOfferId
            )
            setRemoveDialog({ open: false, association: null })
          }}
        />
      )}
    </>
  )
}
