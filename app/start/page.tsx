import { Suspense } from "react"
import { StartOnboardingSlider } from "@/components/asignup/start-onboarding-slider"

interface StartPageProps {
    searchParams: Promise<{ path?: string }>
}

export default async function StartPage({ searchParams }: StartPageProps) {
    const params = await searchParams
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <StartOnboardingSlider path={params.path} />
        </Suspense>
    )
}
