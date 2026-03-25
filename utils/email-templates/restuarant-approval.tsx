import { Section, Text, Button } from "@react-email/components"
import { EmailLayout } from "./components/layout"

interface RestaurantApprovalEmailProps {
    ownerName: string
    restaurantName: string
    restaurantImage: string
}

export const RestaurantApprovalEmail = ({
    ownerName,
    restaurantName,
}: RestaurantApprovalEmailProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatout.com"

    return (
        <EmailLayout preview={`${restaurantName} has been approved!`}>
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>Restaurant Approved!</Text>
                <Text style={styles.heroSubtitle}>
                    Congratulations {ownerName}, your restaurant has been approved on Eatinout!
                </Text>
            </Section>
            {/* Restaurant Details */}
            <Section style={styles.restaurantSection}>
                {/* <Img src={restaurantImage} width="100%" height="200" alt={restaurantName} style={styles.restaurantImage} /> */}

                <div style={styles.restaurantDetailsBox}>
                    <Text style={styles.restaurantName}>{restaurantName}</Text>
                    <Text style={styles.approvalMessage}>
                        Your restaurant profile has been reviewed and approved. You can now create exclusive offers for Eatinout
                        users.
                    </Text>
                </div>
            </Section>

            {/* Next Steps */}
            <Section style={styles.stepsSection}>
                <Text style={styles.stepsTitle}>Next Steps</Text>

                <div style={styles.stepBox}>
                    <Text style={styles.stepNumber}>1</Text>
                    <div style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Log in to your dashboard</Text>
                        <Text style={styles.stepText}>Access your restaurant dashboard to manage your profile and offers.</Text>
                    </div>
                </div>

                <div style={styles.stepBox}>
                    <Text style={styles.stepNumber} >2</Text>
                    <div style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Create your first offer</Text>
                        <Text style={styles.stepText}>
                            Set up attractive offers to bring in new customers during your preferred times.
                        </Text>
                    </div>
                </div>

                <div style={styles.stepBox}>
                    <Text style={styles.stepNumber}>3</Text>
                    <div style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Track performance</Text>
                        <Text style={styles.stepText}>
                            Monitor redemptions and customer engagement through your analytics dashboard.
                        </Text>
                    </div>
                </div>
            </Section>

            {/* CTA */}
            <Section style={styles.ctaSection}>
                <Button style={styles.ctaButton} href={`${baseUrl}/dashboard`}>
                    Go to Restaurant Dashboard
                </Button>
            </Section>

            {/* Support */}
            <Section style={styles.supportSection}>
                <Text style={styles.supportTitle}>Need Help?</Text>
                <Text style={styles.supportText}>
                    Our restaurant success team is here to help you get the most out of Eatinout.
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
    restaurantSection: {
        padding: "0",
    },
    // restaurantImage: {
    //     width: "100%",
    //     height: "auto",
    //     objectFit: "cover" as const,
    //     borderRadius: "0",
    // },
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
    approvalMessage: {
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
    ctaSection: {
        padding: "32px 24px",
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

export default RestaurantApprovalEmail