import nodemailer from "nodemailer";

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false, // Use STARTTLS // true for port 465
      auth: {
        user: "Info@eatinout.com",
        pass: "ChopsY123!",
      },
    });

    const mailOptions = {
      from: '"Eatinout" <Info@eatinout.com>',
      to,
      subject,
      html,
    };
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

export default sendEmail;
