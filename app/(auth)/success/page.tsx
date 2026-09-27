'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { PostSignupSuccessDemo } from '@/components/prototypes/eatinout-post-signup/post-signup-success-demo'

const REDIRECT_DELAY_MS = 3500

export default function SuccessPage() {
    const router = useRouter()
    const { checkAuth } = useAuth()
    const hasRunRef = useRef(false)

    useEffect(() => {
        if (hasRunRef.current) return
        hasRunRef.current = true

        let timer: ReturnType<typeof setTimeout>

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

            timer = setTimeout(() => {
                router.push('/restaurants')
            }, REDIRECT_DELAY_MS)
        }

        run()

        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [router, checkAuth])

    return <PostSignupSuccessDemo />
}