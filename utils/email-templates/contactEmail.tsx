interface ContactEmailProps {
  type: "restaurant" | "user";
  name: string;
  email: string;
  phone?: string;
  restaurantName?: string;
  location?: string;
  enquiryType?: string;
  message: string;
}

export function getContactEmailHTML({
  type,
  name,
  email,
  phone,
  restaurantName,
  location,
  enquiryType,
  message,
}: ContactEmailProps) {
  return `
  <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin:0;">
      <div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color:#E53E3E; padding: 20px; text-align:center;">
          <h1 style="color:#ffffff; margin:0; font-size:24px;">${type === "restaurant" ? "New Partnership Enquiry" : "New User Support Enquiry"}</h1>
        </div>

        <!-- Body -->
        <div style="padding:24px;">
          <p style="font-size:16px; color:#333333; margin:0 0 16px;">
            Hello Admin,
          </p>
          <p style="font-size:16px; color:#333333; margin:0 0 24px;">
            You have received a new ${type === "restaurant" ? "restaurant/venue partnership enquiry" : "user support enquiry"}. Below are the details:
          </p>

          <!-- Details -->
          <div style="background-color:#f9f9f9; padding:16px; border-radius:8px; margin-bottom:24px; border:1px solid #e6e6e6;">
            ${
              type === "restaurant"
                ? `
                  <p><strong>Restaurant/Venue Name:</strong> ${restaurantName || "N/A"}</p>
                  <p><strong>Contact Name:</strong> ${name}</p>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Phone:</strong> ${phone || "N/A"}</p>
                  <p><strong>Location:</strong> ${location || "N/A"}</p>
                `
                : `
                  <p><strong>Name:</strong> ${name}</p>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Enquiry Type:</strong> ${enquiryType || "N/A"}</p>
                `
            }
          </div>

          <!-- Message -->
          <div style="background-color:#fff3cd; padding:16px; border-radius:8px; border:1px solid #ffeeba; margin-bottom:24px;">
            <p style="margin:0;"><strong>Message:</strong></p>
            <p style="margin:8px 0 0; color:#333333; white-space:pre-wrap;">${message}</p>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}
