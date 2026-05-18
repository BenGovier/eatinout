export function PromoStrip() {
    return (
        <div className="bg-primary">
            <div className="mx-auto max-w-7xl px-4 py-2.5 text-center">
                <a
                    href="https://www.eatinout.com/sign-up"
                    className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-white/90 transition-colors"
                >
                    <span aria-hidden="true">🎁</span>
                    <span>Get 7 days free now!</span>
                    <span aria-hidden="true">🎁</span>
                </a>
            </div>
        </div>
    )
}
