import { Section, Text } from "@react-email/components"
import { EmailLayout } from "./components/layout"

interface NewOfferSubmissionEmailProps {
    venueName: string
    offerTitle: string
    offerDescription: string
    offerType: string
    validDays: string
    validHours: string
    startDate: string
    expiryDate?: string
    termsAndConditions: string
    dineIn: boolean
    dineOut: boolean
    runUntilFurther?: boolean
    submissionDate: string
}

export const NewOfferSubmissionEmail = ({
    venueName,
    offerTitle,
    offerDescription,
    offerType,
    startDate,
    expiryDate,
    termsAndConditions,
    runUntilFurther,
    submissionDate,
}: NewOfferSubmissionEmailProps) => {

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
    }


    return (
        <EmailLayout preview="New Offer Submission ">
            {/* Hero Section */}
            <Section style={styles.heroSection}>
                <Text style={styles.heroTitle}>New Offer Submission</Text>
                <Text style={styles.heroSubtitle}>
                    A new offer has been submitted and requires review.
                </Text>
            </Section>

            {/* Main Content */}
            <Section style={styles.contentSection}>
                <Text style={styles.greeting}>Admin,</Text>

                <Text style={styles.message}>
                    A new offer has been submitted by
                    <b>&nbsp;{venueName}&nbsp;</b>
                    .
                    Please review the details below.
                </Text>

                {/* Venue Information */}
                <div style={styles.infoBox}>
                    <Text style={styles.sectionTitle}>Venue Information</Text>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Venue Name:</Text>
                        <Text style={styles.detailValue}>{venueName}</Text>
                    </div>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Submission Date:</Text>
                        {/* <Text style={styles.detailValue}>{formatDateTime(submissionDate)}</Text> */}
                        <Text style={styles.detailValue}>
                            {new Date(submissionDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                        </Text>
                    </div>
                </div>

                {/* Offer Details */}
                <div style={styles.infoBox}>
                    <Text style={styles.sectionTitle}>Offer Details</Text>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Offer Title:</Text>
                        <Text style={styles.detailValue}>{offerTitle}</Text>
                    </div>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Description:</Text>
                        <Text style={styles.detailValue}>{offerDescription}</Text>
                    </div>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Offer Type:</Text>
                        <Text style={styles.detailValue}>{offerType}</Text>
                    </div>

                    {/* <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Valid Days:</Text>
                        <Text style={styles.detailValue}>{validDays}</Text>
                    </div>

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Valid Hours:</Text>
                        <Text style={styles.detailValue}>{validHours}</Text>
                    </div> */}

                    <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Start Date:</Text>
                        <Text style={styles.detailValue}>{formatDate(startDate)}</Text>
                    </div>

                    {!runUntilFurther && expiryDate && (
                        <div style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Expiry Date:</Text>
                            <Text style={styles.detailValue}>{formatDate(expiryDate)}</Text>
                        </div>
                    )}

                    {runUntilFurther && (
                        <div style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Duration:</Text>
                            <Text style={styles.detailValue}>Run until further notice</Text>
                        </div>
                    )}

                    {/* <div style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Dining Options:</Text>
                        <Text style={styles.detailValue}>
                            {[dineIn && "Dine In", dineOut && "Takeaway"].filter(Boolean).join(", ")}
                        </Text>
                    </div> */}
                </div>

                {/* Terms & Conditions */}
                {termsAndConditions && (
                    <div style={styles.termsBox}>
                        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
                        <Text style={styles.termsText}>{termsAndConditions}</Text>
                    </div>
                )}

                <Text style={styles.message}>
                    Please review this offer carefully and take appropriate action.
                </Text>
            </Section>
        </EmailLayout>
    )
}

const styles = {
    heroSection: {
        padding: "32px 24px",
        backgroundColor: "#E53E3E", // Blue for new submission
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
    infoBox: {
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        padding: "20px",
        margin: "0 0 20px",
        border: "1px solid #e6e6e6",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333333",
        margin: "0 0 16px",
        borderBottom: "2px solid #2563EB",
        paddingBottom: "8px",
    },
    detailRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        margin: "0 0 12px",
        flexWrap: "wrap" as const,
    },
    detailLabel: {
        fontSize: "14px",
        color: "#666666",
        fontWeight: "bold",
        margin: "0",
        minWidth: "120px",
        flex: "0 0 auto",
    },
    detailValue: {
        fontSize: "14px",
        color: "#333333",
        margin: "0",
        flex: "1",
        textAlign: "left" as const,
        marginLeft: "12px",
    },
    termsBox: {
        backgroundColor: "#fff3cd",
        borderRadius: "8px",
        padding: "20px",
        margin: "0 0 24px",
        border: "1px solid #ffeaa7",
    },
    termsText: {
        fontSize: "14px",
        color: "#333333",
        margin: "0",
        lineHeight: "22px",
        whiteSpace: "pre-wrap" as const,
    },
    ctaSection: {
        padding: "0 24px 32px",
        textAlign: "center" as const,
    },
    ctaButton: {
        backgroundColor: "#2563EB",
        color: "white",
        borderRadius: "8px",
        fontWeight: "bold",
        padding: "14px 28px",
        border: "none",
        fontSize: "16px",
        textDecoration: "none",
    },
    helpSection: {
        padding: "24px",
        textAlign: "center" as const,
        backgroundColor: "#f8f9fa",
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
        margin: "0",
        lineHeight: "20px",
    },
}

export default NewOfferSubmissionEmail
