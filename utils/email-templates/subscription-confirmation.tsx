import { Section, Text, Button, Hr } from "@react-email/components"
import { EmailLayout } from "./components/layout"

interface SubscriptionConfirmationEmailProps {
    firstName: string
    planName: string // e.g., "Monthly Subscription"
    amount: string // e.g., "£9.99"
    billingDate: string // e.g., "15th of each month"
    startDate: string // ISO date string
}

export const SubscriptionConfirmationEmail = ({
    firstName,
}: SubscriptionConfirmationEmailProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatout.com"
    return (
        <EmailLayout preview="Your Eatinout subscription is confirmed">
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>Subscription Confirmed</Text>
                <Text style={styles.heroSubtitle}>Thank you for subscribing to Eatinout!</Text>
            </Section>

            {/* Main Content */}
            <Section style={styles.contentSection}>
                <Text style={styles.greeting}>Hi {firstName},</Text>

                <Text style={styles.message}>
                    Your subscription to Eatinout has been confirmed. You now have full access to exclusive restaurant deals and
                    offers.
                </Text>

                <Text style={styles.message}>
                    Now you are subscribed make sure you download the free app here:{" "}
                    <a href="https://share.google/rcCBLtfRFpi7SlU5d" style={styles.appLink} target="_blank" rel="noopener noreferrer">
                        Download Eatinout App
                    </a>
                </Text>
{/* 
                <div style={styles.subscriptionBox}>
                    <Text style={styles.subscriptionTitle}>Subscription Details</Text>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Plan: &nbsp;&nbsp;</Text>
                        <Text style={styles.detailValue}>{planName}</Text>
                    </div>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount: &nbsp;&nbsp;</Text>
                        <Text style={styles.detailValue}>4.99 GBP per month</Text>
                    </div>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Start Date: &nbsp;&nbsp;</Text>
                        <Text style={styles.detailValue}>
                            {new Date(startDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </Text>
                    </div>
                    

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Next Billing: &nbsp;&nbsp;</Text>
                        <Text style={styles.detailValue}>{billingDate}</Text>
                    </div>
                </div> */}

                <Text style={styles.message}>
                    You can manage your subscription, update payment details, or cancel at any time from your account settings.
                </Text>
            </Section>

            {/* CTA */}
            <Section style={styles.ctaSection}>
                <Button style={styles.ctaButton} href={`${baseUrl}/account`}>
                    Manage Subscription
                </Button>
            </Section>

            {/* Benefits */}
            <Section style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>Your Benefits</Text>
                <Hr style={styles.divider} />

                <div style={styles.benefitRow}>
                    <Text style={styles.benefitEmoji}>🍽️</Text>
                    <div style={styles.benefitContent}>
                        <Text style={styles.benefitTitle}>Exclusive Deals</Text>
                        <Text style={styles.benefitText}>Access to special offers at hundreds of restaurants</Text>
                    </div>
                </div>

                <Hr style={styles.divider} />

                <div style={styles.benefitRow}>
                    <Text style={styles.benefitEmoji}>💰</Text>
                    <div style={styles.benefitContent}>
                        <Text style={styles.benefitTitle}>Save Money</Text>
                        <Text style={styles.benefitText}>Up to 50% off at participating restaurants</Text>
                    </div>
                </div>

                <Hr style={styles.divider} />

                <div style={styles.benefitRow}>
                    <Text style={styles.benefitEmoji}>🔄</Text>
                    <div style={styles.benefitContent}>
                        <Text style={styles.benefitTitle}>Unlimited Redemptions</Text>
                        <Text style={styles.benefitText}>No limit on how many offers you can redeem</Text>
                    </div>
                </div>
            </Section>

            {/* Help */}
            <Section style={styles.helpSection}>
                <Text style={styles.helpTitle}>Need Help?</Text>
                <Text style={styles.helpText}>
                    If you have any questions about your subscription, please contact our support team.
                </Text>
                <Button style={styles.helpButton} href="mailto:info@eatinout.com">
                    Contact Support
                </Button>
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
        padding: "32px 24px",
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
    appLink: {
        color: "#E53E3E",
        textDecoration: "underline",
        fontWeight: "bold" as const,
    },
    subscriptionBox: {
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        padding: "16px",
        margin: "0 0 24px",
    },
    subscriptionTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 16px",
        textAlign: "center" as const,
    },
    detailRow: {
        display: "flex",
        justifyContent: "space-between",
        margin: "0 0 8px",
    },
    detailLabel: {
        fontSize: "14px",
        color: "#666666",
        fontWeight: "bold",
        margin: "0",
    },
    detailValue: {
        fontSize: "14px",
        color: "#333333",
        margin: "0",
        marginleft: "5px",
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
    benefitsSection: {
        padding: "24px",
        backgroundColor: "#f9f9f9",
    },
    benefitsTitle: {
        fontSize: "20px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 16px",
        textAlign: "center" as const,
    },
    divider: {
        borderColor: "#e6e6e6",
        margin: "16px 0",
    },
    benefitRow: {
        display: "flex",
        alignItems: "center",
    },
    benefitEmoji: {
        fontSize: "24px",
        margin: "0 16px 0 0",
    },
    benefitContent: {
        flex: "1",
    },
    benefitTitle: {
        fontSize: "16px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 4px",
    },
    benefitText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0",
        lineHeight: "20px",
    },
    helpSection: {
        padding: "24px",
        textAlign: "center" as const,
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
    helpButton: {
        backgroundColor: "transparent",
        color: "#E53E3E",
        borderRadius: "8px",
        fontWeight: "bold",
        padding: "12px 24px",
        border: "2px solid #E53E3E",
        fontSize: "14px",
        textDecoration: "none",
    },
}

export default SubscriptionConfirmationEmail