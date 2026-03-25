import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import { getContactEmailHTML } from "@/utils/email-templates/contactEmail";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { type, name, email, phone, restaurantName, location, enquiryType, message } = data;

    if (type !== "restaurant" && type !== "user") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const html = getContactEmailHTML({
      type,
      name,
      email,
      phone,
      restaurantName,
      location,
      enquiryType,
      message,
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: "Info@eatinout.com",
        pass: "ChopsY123!",
      },
    });

    await transporter.sendMail({
      from: '"Eatinout" <Info@eatinout.com>',
      to: "info@eatinout.com",
      subject: `New ${type === "restaurant" ? "Restaurant/Venue" : "User"} Enquiry`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 });
  }
}
