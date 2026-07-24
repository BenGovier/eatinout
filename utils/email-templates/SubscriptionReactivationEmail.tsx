import { Section, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/layout"

interface SubscriptionReactivationEmailProps {
    firstName: string
    nextPaymentDate: string // formatted UK date
}

export const SubscriptionReactivationEmail = ({
    firstName,
    nextPaymentDate,
}: SubscriptionReactivationEmailProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatinout.com"

    return (
        <EmailLayout preview="Your membership is active again">
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>Welcome back!</Text>
                <Text style={styles.heroSubtitle}>
                    Your EatinOut membership is active again.
                </Text>
            </Section>

            {/* Main Content */}
            <Section style={styles.contentSection}>
                <Text style={styles.greeting}>Hi {firstName},</Text>

                <Text style={styles.message}>
                    Great news — we&apos;ve cancelled your scheduled cancellation and your
                    membership will continue as normal. You keep full access to member-only
                    restaurant offers with no interruption.
                </Text>

                {nextPaymentDate ? (
                    <div style={styles.subscriptionBox}>
                        <Text style={styles.subscriptionTitle}>Your next payment</Text>
                        <Text style={styles.message}>
                            Your membership will renew as usual on
                            <br />
                            <strong style={{ display: "block", marginTop: "10px" }}>{nextPaymentDate}</strong>
                        </Text>
                    </div>
                ) : null}

                <Text style={styles.message}>
                    You can manage your membership at any time from your account.
                </Text>
            </Section>

            {/* CTA */}
            <Section style={styles.ctaSection}>
                <Button style={styles.ctaButton} href={`${baseUrl}/restaurants`}>
                    Explore Restaurants
                </Button>
            </Section>
        </EmailLayout>
    )
}

const styles = {
    heroSection: {
        padding: "32px 24px",
        backgroundColor: "#16a34a",
        textAlign: "center" as const,
    },
    heroTitle: {
        fontSize: "28px",
        fontWeight: "bold",
        color: "white",
        margin: "0 0 16px",
    },
    heroSubtitle: {
        fontSize: "16px",
        color: "white",
        margin: "0",
        lineHeight: "24px",
    },
    contentSection: {
        padding: "32px 24px 10px",
    },
    greeting: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 16px",
    },
    message: {
        fontSize: "16px",
        color: "#666666",
        margin: "0 0 24px",
        lineHeight: "24px",
    },
    subscriptionBox: {
        backgroundColor: "#f0fdf4",
        borderRadius: "8px",
        padding: "20px",
        margin: "0 0 24px",
        border: "1px solid #bbf7d0",
        textAlign: "center" as const,
    },
    subscriptionTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#16a34a",
        margin: "0 0 16px",
    },
    ctaSection: {
        padding: "0 24px 32px",
        textAlign: "center" as const,
    },
    ctaButton: {
        backgroundColor: "#16a34a",
        color: "white",
        borderRadius: "8px",
        fontWeight: "bold",
        padding: "12px 24px",
        border: "none",
        fontSize: "16px",
        textDecoration: "none",
    },
}

export default SubscriptionReactivationEmail
