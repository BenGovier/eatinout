'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { checkFirstLoginOnDevice } from '@/lib/deviceLogin'
import { useAuth } from '@/context/auth-context'

function SuccessPageContent() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('session_id')
    const router = useRouter()
    const { checkAuth } = useAuth()
    const hasVerifiedRef = useRef(false) // Track if verification has been done

    useEffect(() => {
        const verifyPayment = async () => {
            if (!sessionId || hasVerifiedRef.current) {
                if (!sessionId) {
                    setStatus('error')
                }
                return
            }

            // Mark as verified immediately to prevent duplicate calls
            hasVerifiedRef.current = true

            try {
                const response = await fetch('/api/payment/verify-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId,
                    }),
                })

                if (!response.ok) {
                    throw new Error()
                }

                const data = await response.json()
                setStatus('success')
                
                // Refresh the auth context to get the updated subscription status
                await checkAuth()
                
                console.log("Auth context refreshed after subscription")
                
                // Wait a bit to ensure auth state is fully propagated
                await new Promise(resolve => setTimeout(resolve, 500))
                
                // Priority 1: Check for redirect URL in sessionStorage
                const redirectUrl = sessionStorage.getItem('redirectUrl')
                console.log('🔍 Checking for redirectUrl in sessionStorage:', redirectUrl)
                if (redirectUrl) {
                    console.log('✅ Found redirectUrl, redirecting to:', decodeURIComponent(redirectUrl))
                    sessionStorage.removeItem('redirectUrl') // cleanup
                    router.push(decodeURIComponent(redirectUrl))
                    return
                } else {
                    console.log('⚠️ No redirectUrl found in sessionStorage')
                }

                // Priority 2: Check if restaurantId exists in sessionStorage
                const restaurantId = sessionStorage.getItem('restaurantId')
                if (restaurantId) {
                    router.push(`/restaurant/${restaurantId}`)
                    sessionStorage.removeItem('restaurantId') // cleanup
                } else {
                    // normal flow
                    const isFirstLogin = checkFirstLoginOnDevice()
                    if (isFirstLogin) {
                        router.push("/how-it-works")
                    } else {
                        router.push("/")
                    }
                }

            } catch (err) {
                setStatus('error')
            }
        }

        verifyPayment()
    }, [sessionId, router, checkAuth])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg text-center">
                {status === 'loading' && (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
                )}

                {status === 'success' && (
                    <div>
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Payment Successful!
                        </h1>
                        <p className="text-gray-600">
                            Thank you for your subscription. You now have access to all premium features.
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <h1 className="text-2xl font-bold text-red-500 mb-2">
                            Payment Verification Failed
                        </h1>
                        <p className="text-gray-600">
                            There was an error verifying your payment. Please contact support if this persists.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="text-center">Loading...</div>}>
            <SuccessPageContent />
        </Suspense>
    )
}