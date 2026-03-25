"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Store, Clock, Calendar, Ticket, CheckCircle, Eye, MapPin } from "lucide-react"
import { RedeemAnimation } from "./redeem-animation"
import { useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
interface Restaurant {
  _id: string
  name: string
  address: string
  city: string
  zipCode: string
  addressLink?: string
  dineIn: boolean
  dineOut: boolean
  category: string
  images: string[]
  phone: string
  email: string
  website?: string
  deliveryAvailable: boolean
}

interface Offer {
  _id: string
  restaurantName: string
  offerTitle: string
  redeemCode: string
  expiryDate: string
  redeemed: boolean
  title: string
  description: string
  validDays: string
  validHours: string
  terms: string
  dineIn: boolean
  dineOut: boolean
  phone: string
  redeemStatus: boolean
  redeemCodeExpiry: number
  userPhone: string
  walletId: string
  isRedeemCodeExpired: boolean
  restaurant?: Restaurant
  bookingRequirement:string
}

interface RedeemCodeProps {
  offer: Offer
  onMarkAsUsed: () => void
  currentTime?: Date
  showRedeemCode?: boolean
  onCodeExpired?: () => void
}

export function RedeemCode({ offer, onMarkAsUsed, currentTime, showRedeemCode = true, onCodeExpired }: RedeemCodeProps) {
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemError, setRedeemError] = useState(false)
  const [isCodeRevealed, setIsCodeRevealed] = useState(offer.redeemStatus || false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [revealedInSession, setRevealedInSession] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)



  useEffect(() => {
    if (offer.redeemStatus && offer.redeemCodeExpiry && !revealedInSession) {
      const timeLeft = Math.floor((offer.redeemCodeExpiry - Date.now()) / 1000)

      if (timeLeft > 0) {
        setTimeRemaining(timeLeft)
        setIsExpired(false)

        timerRef.current = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(timerRef.current!)
              setIsExpired(true)
              if (onCodeExpired) {
                onCodeExpired()
              }
              return 0
            }
            return prev - 1
          })
        }, 1000)

        return () => {
          if (timerRef.current) clearInterval(timerRef.current)
        }
      } else {
        setIsExpired(true)
        if (onCodeExpired) {
          onCodeExpired()
        }
      }
    }
  }, [offer.redeemStatus, offer.redeemCodeExpiry, revealedInSession, onCodeExpired])

  const handleRedeem = async (offerId: string) => {
    setRedeemLoading(true)
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, offerStatus: 'redeemed' }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 410) {
          // Offer fully claimed
          toast.error(data.message || "This offer has reached its redemption limit")
        } else if (response.status === 409) {
          // Already redeemed by this user
          toast.error("You have already redeemed this offer")
        } else {
          // Generic error
          toast.error(data.error || "Failed to add offer to wallet")
        }
        setRedeemError(true)
        return
      }

      onMarkAsUsed()
      window.location.href = `/wallet`
    } catch (err) {
      console.error("Error redeeming offer:", err)
      toast.error("An error occurred while redeeming the offer")
      setRedeemError(true)
    } finally {
      setRedeemLoading(false)
    }
  }

  const formatDate = (date: string) => {
    if (!date) return 'Until Further Notice';
    const dateObj = new Date(date);
    return dateObj.toLocaleString("en-GB", { dateStyle: 'short', timeStyle: 'short' });
  };


  const handleRevealCode = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/reveal-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId: offer.walletId }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setIsCodeRevealed(true)
        setRevealedInSession(true)
        setIsDialogOpen(false)

        const timeLeft = Math.floor((data.redeemCodeExpiry - Date.now()) / 1000)
        if (timeLeft > 0) {
          setTimeRemaining(timeLeft)
          setIsExpired(false)

          timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(timerRef.current!)
                setIsExpired(true)
                if (onCodeExpired) {
                  onCodeExpired()
                }
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }

        setLoading(false)
      } else {
        toast.error(data.message || "Failed to reveal code")
        setLoading(false)
      }
    } catch (error) {
      toast.error("Something went wrong while revealing the code")
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center mb-3">Are you sure?</DialogTitle>
            <div className="bg-red-100 text-red-800 border border-red-300 rounded-md px-4 py-3 mt-4 text-sm text-center">
              Only reveal at the restaurant. After revealing, the offer will expire in 1 minute.
              Please reveal only when you're ready to use it ⚠️
            </div>
          </DialogHeader>
          <DialogFooter className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Later</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRevealCode}
              disabled={loading}
            >
              {loading ? "Revealing . . ." : "Reveal Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-white py-0">
        <CardContent className="p-4 shadow-lg rounded-xl bg-white border-[1px] border-gray-300 bg-opacity-50 backdrop-blur-sm">
          <div className="mb-4">
            <div className="flex items-start gap-3 mb-2">

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <Store className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg sm:text-base text-gray-600 break-words">
                      {offer.restaurant?.name || offer.restaurantName}
                    </h3>
                    {/* {offer.restaurant?.deliveryAvailable && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      Delivery Available
                    </Badge>} */}
                  </div>
                </div>
                {offer.restaurant && (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      {offer.restaurant.addressLink ? (
                        <a
                          href={offer.restaurant.addressLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 leading-tight break-words min-w-0"
                        >
                          {offer.restaurant.address || ""}, {offer.restaurant.city || ""} {offer.restaurant.zipCode || ""}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-600 leading-tight break-words min-w-0">
                          {offer.restaurant.address || ""}, {offer.restaurant.city || ""} {offer.restaurant.zipCode || ""}
                        </span>
                      )}
                    </div>


                    <div className="flex flex-wrap gap-4 mt-2">
                      {/* <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a
                          href={`tel:${offer.restaurant.phone}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {offer.restaurant.phone}
                        </a>
                      </div>

                      {offer.restaurant.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <a
                            href={`mailto:${offer.restaurant.email}`}
                            className="text-sm text-blue-600 hover:underline truncate"
                          >
                            {offer.restaurant.email}
                          </a>
                        </div>
                      )} */}

                      {/* {offer.restaurant.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <a
                            href={offer.restaurant.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Website
                          </a>
                        </div>
                      )}
                      <div className="flex gap-2 ">
                        {offer.restaurant.dineIn && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Dine In
                          </span>
                        )}
                        {offer.restaurant.dineOut && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Dine Out
                          </span>
                        )}
                      </div> */}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
              <p className="text-gray-900 font-semibold text-base sm:text-lg break-words">
                <span className="font-bold text-red-600 break-words">{offer.offerTitle}</span>
              </p>
              <p className="text-gray-800 font-bold text-sm sm:text-lg break-words">{offer.title}</p>

              <div className="text-gray-600 leading-relaxed space-y-2 text-sm sm:text-base">
                {offer.description.split("\n").map((line, idx) => (
                  <p key={idx}>{line.trim()}</p>
                ))}
                {offer.terms && (
                  <>
                    <p className="text-gray-800 font-semibold mt-2">Terms & Conditions:</p>
                    {offer.terms.split("\n").map((line, idx) => (
                      <p key={idx}>{line.trim()}</p>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 lg:ml-4 lg:min-w-[200px]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium">
                  <span className="text-gray-800 font-bold">Valid:</span> {offer.validDays}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium">
                  <span className="text-gray-800 font-bold">Hours:</span> {offer.validHours}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium">
                  <span className="text-gray-800 font-bold">Expiry:</span> {formatDate(offer.expiryDate)}
                </p>
              </div>
            </div>
          </div>

          {offer.redeemed && (
            <div className="p-2 mt-3 bg-gradient-to-r from-red-50 to-red-50 rounded-xl text-center mb-2">
              <p className="text-sm text-red-600 font-semibold mb-3">Your Code</p>
              <div className="flex items-center justify-center gap-2 flex-col">
                {showRedeemCode ? (
                  <>
                    {isCodeRevealed ? (
                      <>
                        <div className="flex items-center justify-center gap-3">
                          <Ticket className="h-7 w-7 text-red-600" />
                          <p className="text-xl font-mono font-bold tracking-wider text-gray-900">
                            {offer.redeemCode}
                          </p>
                        </div>

                        {timeRemaining !== null && !isExpired && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                            This code will expire in <span className="font-bold">{timeRemaining}</span> seconds
                          </div>
                        )}

                        {offer.redeemStatus && isExpired && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            This code has expired
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {!offer.redeemStatus && (
                          <Button
                            variant="outline"
                            className="bg-red-600 hover:bg-red-600 text-white hover:text-white border-0 py-2 px-4 rounded-xl font-medium transition-colors shadow-sm hover:shadow-md"
                            onClick={() => setIsDialogOpen(true)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Reveal
                          </Button>
                        )}

                        {offer.redeemStatus && (
                          <div className="flex items-center justify-center gap-3">
                            <Ticket className="h-7 w-7 text-red-600 mx-3" />
                            <p className="text-xl font-mono font-bold tracking-wider text-gray-900">
                              {offer.redeemCode}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    This offer code has expired and can't be used anymore.
                  </div>
                )}
              </div>
            </div>
          )}

          {!offer.redeemed && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-center mb-2">
              <p className="text-sm text-gray-700 font-medium mb-3">You haven't redeemed this offer yet.</p>
            </div>
          )}

          {/* Booking Requirement Message */}
          {offer.restaurant?.phone && offer.bookingRequirement && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              {offer.bookingRequirement === "mandatory" && (
                <p>
                  💡You are required to book ahead for this deal, call{" "}
                  <a href={`tel:${offer.restaurant.phone}`} className="text-blue-600 underline font-medium">
                    {offer.restaurant.phone}
                  </a>
                </p>
              )}
              {offer.bookingRequirement === "recommended" && (
                <p>
                  💡It’s recommended you book but not always essential call{" "}
                  <a href={`tel:${offer.restaurant.phone}`} className="text-blue-600 underline font-medium">
                    {offer.restaurant.phone}
                  </a>
                </p>
              )}
              {offer.bookingRequirement === "notNeeded" && (
                <p>
                  💡You do not need to call ahead or book
                </p>
              )}
            </div>
          )}
          {/* {offer.restaurant?.addressLink && (
            <div className=" mt-2">
              <a
                href={offer.restaurant.addressLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center  text-sm text-blue-600 hover:underline"
              >
                <div className="flex items-center">
                  <MapPin className="h-4 mb-1" />
                  <span className="mb-1">View Restaurant on Map</span>
                </div>
              </a>
            </div>
          )} */}
        </CardContent>
        {!offer.redeemed && (
          <CardFooter className="p-6 pt-0 flex justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-36 bg-gray-600 hover:bg-gray-700 text-white border-0 py-3 rounded-xl font-medium transition-colors shadow-sm hover:shadow-md"
              onClick={() => handleRedeem(offer._id)}
              disabled={redeemLoading}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              <RedeemAnimation isVisible={redeemError} onComplete={() => setRedeemError(false)} />
              {redeemLoading ? "Loading..." : "Add to wallet"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  )
}