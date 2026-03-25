
import { Section, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/layout"

interface PasswordResetEmailProps {
    firstName: string
    resetLink: string
    expiryTime: string // e.g., "1 hour"
}

export const PasswordResetEmail = ({ firstName, resetLink, expiryTime }: PasswordResetEmailProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatout.com"
    return (
        <EmailLayout preview="Reset your Eatinout password">
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>Reset Your Password</Text>
            </Section>

            {/* Main Content */}
            <Section style={styles.contentSection}>
                <Text style={styles.greeting}>Hi {firstName},</Text>

                <Text style={styles.message}>
                    We received a request to reset your password for your Eatinout account. If you didn't make this request, you can
                    safely ignore this email.
                </Text>

                <Text style={styles.message}>To reset your password, click the button below:</Text>

                <div style={styles.buttonContainer}>
                    <Button style={styles.resetButton} href={resetLink}>
                        Reset Password
                    </Button>
                </div>

                <Text style={styles.expiryNote}>This link will expire in {expiryTime}.</Text>

                <div style={styles.linkBox}>
                    <Text style={styles.linkText}>If the button doesn't work, copy and paste this link into your browser:</Text>
                    <Text style={styles.link}>{resetLink}</Text>
                </div>

                <Text style={styles.securityNote}>
                    For security reasons, this password reset link can only be used once. If you need to reset your password
                    again, please request a new link.
                </Text>
            </Section>

            {/* Security Tips */}
            <Section style={styles.tipsSection}>
                <Text style={styles.tipsTitle}>Security Tips</Text>
                <Text style={styles.tipText}>• Create a strong password that you don't use for other websites</Text>
                <Text style={styles.tipText}>• Never share your password with anyone</Text>
                <Text style={styles.tipText}>• Enable two-factor authentication for added security</Text>
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
        margin: "0",
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
        margin: "0 0 16px",
        lineHeight: "24px",
    },
    buttonContainer: {
        textAlign: "center" as const,
        margin: "24px 0",
    },
    resetButton: {
        backgroundColor: "#E53E3E",
        color: "white",
        borderRadius: "8px",
        fontWeight: "bold",
        padding: "12px 24px",
        border: "none",
        fontSize: "16px",
        textDecoration: "none",
    },
    expiryNote: {
        fontSize: "14px",
        color: "#666666",
        margin: "0 0 24px",
        textAlign: "center" as const,
        fontStyle: "italic",
    },
    linkBox: {
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        padding: "16px",
        margin: "0 0 24px",
    },
    linkText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0 0 8px",
    },
    link: {
        fontSize: "14px",
        color: "#E53E3E",
        margin: "0",
        wordBreak: "break-all" as const,
    },
    securityNote: {
        fontSize: "14px",
        color: "#666666",
        margin: "0",
        fontStyle: "italic",
    },
    tipsSection: {
        padding: "24px",
        backgroundColor: "#f9f9f9",
    },
    tipsTitle: {
        fontSize: "16px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 16px",
    },
    tipText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0 0 8px",
        lineHeight: "20px",
    },
}

export default PasswordResetEmail