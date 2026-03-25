import { Section, Text, Button, Hr, Row, Column } from "@react-email/components"
import { EmailLayout } from "./components/layout"
import { useEffect } from "react"

interface WelcomeEmailProps {
    firstName: string
    trialEndDate: string
    selectedPlan: {
        name: string
        price: string
        period: string
        originalPrice?: string
        discountPercentage?: number
    }
}

export const WelcomeEmail = ({ firstName, trialEndDate, selectedPlan }: WelcomeEmailProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatout.com"

    // Calculate discounted price if applicable
    const calculateFinalPrice = () => {
        if (selectedPlan.discountPercentage) {
            const originalPrice = parseFloat(selectedPlan.price.replace('£', ''));
            const discountedPrice = originalPrice * (1 - selectedPlan.discountPercentage / 100);
            return `£${discountedPrice.toFixed(2)}`;
        }
        return selectedPlan.price;
    }

    return (
        <EmailLayout preview={`Welcome to Eatinout, ${firstName}!`}>
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>Welcome to Eatinout!</Text>
                <Text style={styles.heroSubtitle}>Hi {firstName}, your journey to exclusive restaurant deals starts now.</Text>
            </Section>

            {/* Main Content */}
            <Section style={styles.contentSection}>
                <Text style={styles.welcomeText}>
                    Thank you for joining Eatinout! We're excited to help you discover amazing restaurant deals and save money while
                    dining out.
                </Text>

                <div style={styles.infoBox}>
                    <Text style={styles.infoTitle}>Your Subscription Details</Text>
                    <Text style={styles.infoText}>
                        Plan: {selectedPlan.name} {selectedPlan.period}
                    </Text>
                    {selectedPlan.originalPrice && selectedPlan.discountPercentage ? (
                        <Text style={styles.infoText}>
                            <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '10px' }}>
                                {selectedPlan.originalPrice}
                            </span>
                            <span style={{ color: '#E53E3E', fontWeight: 'bold' }}>
                                {calculateFinalPrice()} ({selectedPlan.discountPercentage}% off)
                            </span>
                        </Text>
                    ) : (
                        <Text style={styles.infoText}>
                            Price: {selectedPlan.price}{selectedPlan.period}
                        </Text>
                    )}
                    <Text style={styles.infoText}>
                        Your free trial is active and will end on{" "}
                        {new Date(trialEndDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                        .
                    </Text>
                    <Text style={styles.infoText}>
                        After your trial ends, you'll be charged {calculateFinalPrice()}{selectedPlan.period} unless you cancel.
                    </Text>
                </div>

                {/* Discount Confirmation */}
                <Section style={styles.discountNote}>
                    <Text style={styles.discountNoteText}>
                        If you've applied any discount or promotional code, your final billed amount will reflect the adjusted price automatically.
                    </Text>
                </Section>

                <Hr style={styles.divider} />

                <Text style={styles.sectionTitle}>Getting Started</Text>

                <Row style={styles.stepsRow}>
                    <Column style={styles.stepColumn}>
                        <div style={styles.stepNumber}>1</div>
                        <Text style={styles.stepTitle}>Browse Deals</Text>
                        <Text style={styles.stepText}>Explore exclusive offers from restaurants in your area.</Text>
                    </Column>

                    <Column style={styles.stepColumn}>
                        <div style={styles.stepNumber}>2</div>
                        <Text style={styles.stepTitle}>Redeem Offers</Text>
                        <Text style={styles.stepText}>Save offers to your wallet and get unique redemption codes.</Text>
                    </Column>

                    <Column style={styles.stepColumn}>
                        <div style={styles.stepNumber}>3</div>
                        <Text style={styles.stepTitle}>Enjoy & Save</Text>
                        <Text style={styles.stepText}>Show your code at the restaurant and enjoy your discount!</Text>
                    </Column>
                </Row>
            </Section>

            {/* CTA */}
            <Section style={styles.ctaSection}>
                <Button style={styles.ctaButton} href={`${baseUrl}/restaurants`}>
                    Explore Restaurants
                </Button>
            </Section>

            {/* App Download */}
            {/* <Section style={styles.appSection}>
                <Text style={styles.appTitle}>Get the Eatinout App</Text>
                <Text style={styles.appText}>
                    Download our mobile app for the best experience and to access your deals on the go.
                </Text>
                <Row style={styles.appButtons}>
                    <Column style={styles.appButtonColumn}>
                        <Button style={styles.appButton} href="#">
                            App Store
                        </Button>
                    </Column>
                    <Column style={styles.appButtonColumn}>
                        <Button style={styles.appButton} href="#">
                            Google Play
                        </Button>
                    </Column>
                </Row>
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
    welcomeText: {
        fontSize: "16px",
        color: "#333333",
        margin: "0 0 24px",
        lineHeight: "24px",
    },
    infoBox: {
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        padding: "16px",
        margin: "0 0 24px",
    },
    infoTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 8px",
    },
    infoText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0 0 8px",
        lineHeight: "20px",
    },
    divider: {
        borderColor: "#e6e6e6",
        margin: "0 0 24px",
    },
    sectionTitle: {
        fontSize: "20px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 24px",
        textAlign: "center" as const,
    },
    stepsRow: {
        width: "100%",
    },
    stepColumn: {
        padding: "0 8px",
        textAlign: "center" as const,
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
    stepTitle: {
        fontSize: "16px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 8px",
    },
    stepText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0",
        lineHeight: "20px",
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
    appSection: {
        padding: "24px",
        backgroundColor: "#f9f9f9",
        textAlign: "center" as const,
    },
    appTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 8px",
    },
    appText: {
        fontSize: "14px",
        color: "#666666",
        margin: "0 0 16px",
        lineHeight: "20px",
    },
    appButtons: {
        width: "100%",
    },
    appButtonColumn: {
        padding: "0 8px",
    },
    appButton: {
        backgroundColor: "#333333",
        color: "white",
        borderRadius: "8px",
        fontWeight: "bold",
        padding: "12px 24px",
        border: "none",
        fontSize: "14px",
        textDecoration: "none",
        width: "100%",
    },
    discountNote: {
        padding: "16px 24px",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        margin: "0 24px 24px",
        textAlign: "center" as const,
    },
    discountNoteText: {
        fontSize: "14px",
        color: "#666666",
        lineHeight: "1.5",
    },
}

export default WelcomeEmail