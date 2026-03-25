import type React from "react"
import { Body, Container, Head, Html, Preview, Section, Text, Link, Hr } from "@react-email/components"

interface EmailLayoutProps {
    preview: string
    children: React.ReactNode
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
    const baseUrl = process.env.NEXTAUTH_URL || "https://eatout.com"
    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={styles.body}>
                <Container style={styles.container}>
                    {/* Header */}
                    {/* <Section style={styles.headerSection}>
                        <Img
                            src={`${baseUrl}/images/eatinoutlogo.webp`}
                            alt="Eatinout"
                            width="80"
                            height="80"
                            style={styles.logo}
                        />
                    </Section> */}
                    {children}

                    {/* Footer */}
                    <Section style={styles.footerSection}>
                        <Hr style={styles.hr} />
                        <Text style={styles.footerText}>© {new Date().getFullYear()} Eatinout. All rights reserved.</Text>
                        <Text style={styles.footerLinks}>
                            <Link href="#" style={styles.link}>
                                Privacy Policy
                            </Link>{" "}
                            •
                            <Link href="#" style={styles.link}>
                                {" "}
                                Terms of Service
                            </Link>{" "}
                            •
                            <Link href="#" style={styles.link}>
                                {" "}
                                Contact Us
                            </Link>
                        </Text>
                        <Text style={styles.footerAddress}>Old Docks House Watery Lane, Ashton-On-Ribble, Preston, PR2 1AU.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

const styles = {
    body: {
        backgroundColor: "#f6f6f6",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        margin: "0",
        padding: "0",
    },
    container: {
        backgroundColor: "#ffffff",
        margin: "0 auto",
        padding: "0",
        maxWidth: "600px",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    },
    headerSection: {
        backgroundColor: "#ffffff",
        padding: "24px",
        textAlign: "center" as const,
        borderBottom: "1px solid #f0f0f0",
    },
    logo: {
        margin: "0 auto",
    },
    footerSection: {
        padding: "24px",
        textAlign: "center" as const,
        backgroundColor: "#f9f9f9",
    },
    footerText: {
        fontSize: "14px",
        color: "#666666",
        margin: "8px 0",
    },
    footerLinks: {
        fontSize: "14px",
        color: "#666666",
        margin: "8px 0",
    },
    footerAddress: {
        fontSize: "12px",
        color: "#999999",
        margin: "8px 0",
    },
    link: {
        color: "#E53E3E",
        textDecoration: "none",
    },
    hr: {
        borderColor: "#e6e6e6",
        margin: "16px 0",
    },
}