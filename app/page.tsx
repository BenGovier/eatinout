import WelcomePage from "./(marketing)/welcome/page"
import MarketingLayout from "./(marketing)/layout"

export default async function RootPage() {
  return (
    <MarketingLayout>
      <WelcomePage />
    </MarketingLayout>
  )
}

