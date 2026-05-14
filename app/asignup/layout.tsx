import { Header } from "@/components/asignup/header"
import { Footer } from "@/components/asignup/footer"
import { PromoStrip } from "@/components/asignup/promo-strip"
import "./asignup-styles.css"

export default function AsignupLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="asignup-container min-h-screen flex flex-col font-sans">
            <Header />
            <PromoStrip />
            <main className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
    )
}
