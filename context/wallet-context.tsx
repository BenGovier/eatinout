"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface WalletContextType {
  redeemedOffers: string[]
  addToWallet: (offerId: string) => void
  removeFromWallet: (offerId: string) => void
  isInWallet: (offerId: string) => boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [redeemedOffers, setRedeemedOffers] = useState<string[]>([])

  // Load redeemed offers from localStorage on mount
  useEffect(() => {
    const savedOffers = localStorage.getItem("redeemedOffers")
    if (savedOffers) {
      try {
        setRedeemedOffers(JSON.parse(savedOffers))
      } catch (e) {
        console.error("Error parsing saved offers:", e)
        setRedeemedOffers([])
      }
    }
  }, [])

  // Save to localStorage whenever redeemedOffers changes
  useEffect(() => {
    if (redeemedOffers.length > 0) {
      localStorage.setItem("redeemedOffers", JSON.stringify(redeemedOffers))
    }
  }, [redeemedOffers])

  const addToWallet = (offerId: string) => {
    if (!redeemedOffers.includes(offerId)) {
      setRedeemedOffers((prev) => [...prev, offerId])
    }
  }

  const removeFromWallet = (offerId: string) => {
    setRedeemedOffers((prev) => prev.filter((id) => id !== offerId))
  }

  const isInWallet = (offerId: string) => {
    return redeemedOffers.includes(offerId)
  }

  return (
    <WalletContext.Provider value={{ redeemedOffers, addToWallet, removeFromWallet, isInWallet }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

