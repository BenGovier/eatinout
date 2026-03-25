'use client'
import { useEffect, useState } from "react"
import { ToastContainer } from "react-toastify"
import 'react-toastify/dist/ReactToastify.css'

export default function ToastWrapper() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return <ToastContainer autoClose={2000} position="top-right" />
}
