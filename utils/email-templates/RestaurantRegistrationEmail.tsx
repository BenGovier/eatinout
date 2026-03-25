import { Section, Text, Button, Img } from "@react-email/components"
import { EmailLayout } from "./components/layout"

interface RestaurantRegistrationEmailProps {
    ownerName: string
    restaurantName: string
    restaurantImage: string
}

export const RestaurantRegistrationEmail = ({
    ownerName,
    restaurantName,
    restaurantImage,
}: RestaurantRegistrationEmailProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatout.com"

    return (
        <EmailLayout preview={`We've received your submission for ${restaurantName}`}>
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>Registration Received</Text>
                <Text style={styles.heroSubtitle}>
                    Thanks {ownerName}, we’ve received your restaurant registration on Eatinout!
                </Text>
            </Section>

            {/* Restaurant Preview */}
            <Section style={styles.restaurantSection}>
                <Img src={restaurantImage} width="100%" height="200" alt={restaurantName} style={styles.restaurantImage as any} />

                <div style={styles.restaurantDetailsBox}>
                    <Text style={styles.restaurantName}>{restaurantName}</Text>
                    <Text style={styles.pendingMessage}>
                        Your account and offers are currently under review. You’ll be notified as soon as an admin approves your submission.
                    </Text>
                </div>
            </Section>

            {/* What Happens Next */}
            <Section style={styles.stepsSection}>
                <Text style={styles.stepsTitle}>What Happens Next?</Text>

                <div style={styles.stepBox}>
                    <Text style={styles.stepNumber}>1</Text>
                    <div style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Review by our team</Text>
                        <Text style={styles.stepText}>We’re reviewing your restaurant and offers to ensure everything looks good.</Text>
                    </div>
                </div>

                <div style={styles.stepBox}>
                    <Text style={styles.stepNumber}>2</Text>
                    <div style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Approval notification</Text>
                        <Text style={styles.stepText}>
                            You’ll receive an email confirmation once your account is approved.
                        </Text>
                    </div>
                </div>

                <div style={styles.stepBox}>
                    <Text style={styles.stepNumber}>3</Text>
                    <div style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Start managing your profile</Text>
                        <Text style={styles.stepText}>
                            After approval, you’ll be able to log in and set up more offers anytime.
                        </Text>
                    </div>
                </div>
            </Section>

            {/* Contact Support */}
            <Section style={styles.supportSection}>
                <Text style={styles.supportTitle}>Have Questions?</Text>
                <Text style={styles.supportText}>
                    Reach out to our team if you have any concerns or need help with your application.
                </Text>
                <Button style={styles.supportButton} href="mailto:info@eatinout.com">
                    Contact Support
                </Button>
            </Section>
        </EmailLayout>
    )
}

const styles = {
    heroSection: {
        padding: "32px 24px",
        backgroundColor: "#E53E3E", // Blue for registration
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
    restaurantSection: {
        padding: "0",
    },
    restaurantImage: {
        width: "100%",
        height: "200px",
        objectFit: "cover",
        borderRadius: "0",
    },
    restaurantDetailsBox: {
        padding: "24px",
        textAlign: "center" as const,
    },
    restaurantName: {
        fontSize: "22px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 16px",
    },
    pendingMessage: {
        fontSize: "16px",
        color: "#666666",
        margin: "0",
        lineHeight: "24px",
    },
    stepsSection: {
        padding: "24px",
        backgroundColor: "#f9f9f9",
    },
    stepsTitle: {
        fontSize: "20px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 24px",
        textAlign: "center" as const,
    },
    stepBox: {
        display: "flex",
        marginBottom: "16px",
        alignItems: "flex-start",
    },
    stepNumber: {
        backgroundColor: "#E53E3E",
        color: "white",
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        fontSize: "14px",
        fontWeight: "bold",
        marginRight: "16px",
        flexShrink: 0,
        textAlign: "center" as const,
        lineHeight: "28px", // vertically centers text
        display: "inline-block", // prevents collapse
        verticalAlign: "middle", // ensures proper alignment in flow
    },
    stepContent: {
        flex: "1",
    },
    stepTitle: {
        fontSize: "16px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 4px",
    },
    stepText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0",
        lineHeight: "20px",
    },
    supportSection: {
        padding: "24px",
        backgroundColor: "#f0f0f0",
        textAlign: "center" as const,
    },
    supportTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 8px",
    },
    supportText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0 0 16px",
        lineHeight: "20px",
    },
    supportButton: {
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

export default RestaurantRegistrationEmail
