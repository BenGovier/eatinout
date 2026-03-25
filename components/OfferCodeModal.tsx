"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, X } from "lucide-react"
import { useRouter } from "next/navigation" 

type OfferCodeModalProps = {
  isOpen: boolean
  onClose: () => void
  offerTitle: string
  venueName?: string
  isDemoMode?: boolean
}

export function OfferCodeModal({
  isOpen,
  onClose,
  offerTitle,
  venueName = "Demo Restaurant",
  isDemoMode = false,
}: OfferCodeModalProps) {
  const router = useRouter();
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{offerTitle}</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            {/* <X className="h-4 w-4" /> */}
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isDemoMode ? (
            <>
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Lock className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Subscribe to unlock</h3>
                    <p className="text-sm text-muted-foreground">
                      Start your free month to access this offer and hundreds more
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button size="lg"  onClick={() => router.push("/sign-up")} className="w-full rounded-full font-bold">
                  Start free trial → £4.99/month
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push("/")} className="w-full rounded-full bg-transparent">
                  Browse more offers
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">Then £4.99/m. Auto-renews. Cancel anytime.</p>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Venue</p>
                  <p className="font-semibold">{venueName}</p>
                </div>

                <div className="bg-muted rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Your code</p>
                  <p className="text-3xl font-bold tracking-wider">DEMO123</p>
                </div>

                <div className="space-y-2">
                  <Badge variant="secondary" className="w-full justify-center py-2">
                    Show this code before you pay
                  </Badge>
                  <Badge variant="outline" className="w-full justify-center py-2">
                    Valid today
                  </Badge>
                </div>
              </div>

              <Button size="lg" onClick={onClose} className="w-full rounded-full font-bold">
                Got it
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
