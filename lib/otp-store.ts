type OtpData = {
    otp: string;
    expiry: number;
  };
  
  const otpStore: Record<string, OtpData> = {};
  
  export function setOtp(phone: string, otp: string, expiry: number) {
    otpStore[phone] = { otp, expiry };
  }
  
  export function getOtp(phone: string): OtpData | undefined {
    return otpStore[phone];
  }
  
  export function deleteOtp(phone: string) {
    delete otpStore[phone];
  }
  



  //new email opt reated things
  import { Otp } from "@/models/Otp";

// Set OTP for email or phone
export const setOtpDb = async ({
  email,
  phone,
  otp,
  expiry,
}: {
  email?: string;
  phone?: string;
  otp: string;
  expiry: number;
}) => {
  if (!email && !phone) throw new Error("Email or phone required");

  const query = email ? { email } : { phone };

  // Delete old OTP first — prevents duplicate key problem forever
  await Otp.deleteMany(query);

  // Create new OTP cleanly
  return await Otp.create({
    ...query,
    otp,
    expiry,
  });
};

// Get OTP
export const getOtpDb = async (emailOrPhone: string) => {
  return await Otp.findOne({ $or: [{ email: emailOrPhone }, { phone: emailOrPhone }] });
};

// Delete OTP
export const deleteOtpDb = async (emailOrPhone: string) => {
  return await Otp.deleteOne({ $or: [{ email: emailOrPhone }, { phone: emailOrPhone }] });
};
