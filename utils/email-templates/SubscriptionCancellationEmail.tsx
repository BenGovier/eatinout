import { Section, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/layout"

interface SubscriptionCancellationEmailProps {
    firstName: string
    currentPeriodEnd: string // ISO date string or formatted date
}

export const SubscriptionCancellationEmail = ({
    firstName,
    currentPeriodEnd,
}: SubscriptionCancellationEmailProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatinout.com"

    return (
        <EmailLayout preview="Your membership cancellation is scheduled">
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>Cancellation Scheduled</Text>
                <Text style={styles.heroSubtitle}>
                    You still have full access for now.
                </Text>
            </Section>

            {/* Main Content */}
            <Section style={styles.contentSection}>
                <Text style={styles.greeting}>Hi {firstName},</Text>

                <Text style={styles.message}>
                    We&apos;ve scheduled your EatinOut membership to end. You keep full access to all
                    member benefits right up until the date below — nothing changes before then.
                </Text>

                <div style={styles.subscriptionBox}>
                    <Text style={styles.subscriptionTitle}>Your access ends on</Text>

                    <Text style={styles.message}>
                        You can keep using EatinOut until:
                        <br />
                        <strong style={{ display: 'block', marginTop: '10px' }}>{currentPeriodEnd}</strong>
                    </Text>
                </div>

                <Text style={styles.message}>
                    You will not be charged again, and no further renewal will occur after this date.
                </Text>

                <Text style={styles.message}>
                    Changed your mind? You can reactivate your membership any time before this date
                    from your account — you won&apos;t lose access or need to start over.
                </Text>
            </Section>

            {/* CTA */}
            <Section style={styles.ctaSection}>
                <Button style={styles.ctaButton} href={`${baseUrl}/account/payment`}>
                    Manage Account
                </Button>
            </Section>

            {/* Help */}
            <Section style={styles.helpSection}>
                <Text style={styles.helpTitle}>Have feedback for us?</Text>
                <Text style={styles.helpText}>
                    We're always looking to improve. If you have a moment, we'd love to know what made you cancel. Reply to this email and let us know!
                </Text>
            </Section>
        </EmailLayout>
    )
}

const styles = {
    heroSection: {
        padding: "32px 24px",
        backgroundColor: "#E53E3E",
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
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        padding: "20px",
        margin: "0 0 24px",
        border: "1px solid #e6e6e6",
        textAlign: "center" as const,
    },
    subscriptionTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#E53E3E",
        margin: "0 0 16px",
    },
    ctaSection: {
        padding: "0 24px 32px",
        textAlign: "center" as const,
    },
    ctaButton: {
        backgroundColor: "#E53E3E",
        color: "white",
        borderRadius: "8px",
        fontWeight: "bold",
        padding: "12px 24px",
        border: "none",
        fontSize: "16px",
        textDecoration: "none",
    },
    helpSection: {
        padding: "24px",
        textAlign: "center" as const,
        borderTop: "1px solid #e6e6e6",
    },
    helpTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 8px",
    },
    helpText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0 0 16px",
        lineHeight: "20px",
    },
}

export default SubscriptionCancellationEmail
