'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'
import { PostSignupSuccessDemo } from '@/components/prototypes/eatinout-post-signup/post-signup-success-demo'

export default function SuccessPage() {
    const { checkAuth } = useAuth()
    const hasRunRef = useRef(false)

    useEffect(() => {
        if (hasRunRef.current) return
        hasRunRef.current = true

        const run = async () => {
            try {
                await checkAuth()
            } catch (err) {
                console.error('Error refreshing auth on success page:', err)
            }

            // cleanup checkout-related session data
            sessionStorage.removeItem('checkoutEmail')
            sessionStorage.removeItem('selectedPriceId')
            sessionStorage.removeItem('checkoutReferral')
        }

        run()
    }, [checkAuth])

    return <PostSignupSuccessDemo />
}
