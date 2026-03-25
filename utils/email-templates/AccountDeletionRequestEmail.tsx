import { Section, Text, Button, Hr } from "@react-email/components"
import { EmailLayout } from "./components/layout"

interface AccountDeletionRequestEmailProps {
    firstName: string
    lastName: string
    email: string
    requestDate: string // ISO date string
    userId: string
}

export const AccountDeletionRequestEmail = ({
    firstName,
    lastName,
    email,
    requestDate,
    userId,
}: AccountDeletionRequestEmailProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatout.com"

    const formattedDate = new Date(requestDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })

    return (
        <EmailLayout preview="User requested account deletion">
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>Account Deletion Request</Text>
                <Text style={styles.heroSubtitle}>
                    A user has requested to delete their account.
                </Text>
            </Section>

            {/* Main Content */}
            <Section style={styles.contentSection}>
                <Text style={styles.greeting}>Admin,</Text>

                <Text style={styles.message}>
                    The following user has requested account deletion. Please process the
                    request within 48 hours.
                </Text>

                <div style={styles.subscriptionBox}>
                    <Text style={styles.subscriptionTitle}>User Details</Text>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name: &nbsp;</Text>
                        <Text style={styles.detailValue}>
                            {firstName} {lastName}
                        </Text>
                    </div>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email: &nbsp;</Text>
                        <Text style={styles.detailValue}>{email}</Text>
                    </div>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Request Date: &nbsp;</Text>
                        <Text style={styles.detailValue}>{formattedDate}</Text>
                    </div>
                </div>

                <Text style={styles.message}>
                    After confirming, ensure all personal data associated with this user
                    is deleted in compliance with company policy and regulations.
                </Text>
            </Section>

            {/* CTA */}
            <Section style={styles.ctaSection}>
                <Button style={styles.ctaButton} href={`${baseUrl}/admin/users/${userId}`}>
                    Delete account
                </Button>
            </Section>

            {/* Help */}
            {/* <Section style={styles.helpSection}>
                <Text style={styles.helpTitle}>Need Assistance?</Text>
                <Text style={styles.helpText}>
                    If you face any issues processing the deletion request, please contact
                    the technical team.
                </Text>
                <Button style={styles.helpButton} href="mailto:techsupport@eatinout.com">
                    Contact Tech Support
                </Button>
            </Section> */}
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

export default AccountDeletionRequestEmail
