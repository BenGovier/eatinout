import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

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

// Set OTP for email or phone in Supabase
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

  // Delete old OTP first
  let deleteQuery = supabaseAdmin.from("otps").delete();
  if (email) {
    deleteQuery = deleteQuery.eq("email", email);
  } else if (phone) {
    deleteQuery = deleteQuery.eq("phone", phone);
  }
  await deleteQuery;

  // Insert new OTP into Supabase otps table
  const newId = crypto.randomBytes(12).toString("hex");
  const expiryDate = new Date(expiry).toISOString();

  const { data, error } = await supabaseAdmin
    .from("otps")
    .insert({
      id: newId,
      email: email || null,
      phone: phone || null,
      otp,
      expiry: expiryDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error setting OTP in Supabase:", error);
    throw error;
  }

  return {
    ...data,
    expiry: new Date(data.expiry).getTime(),
  };
};

// Get OTP from Supabase
export const getOtpDb = async (emailOrPhone: string) => {
  const { data, error } = await supabaseAdmin
    .from("otps")
    .select("*")
    .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    expiry: new Date(data.expiry).getTime(),
  };
};

// Delete OTP from Supabase
export const deleteOtpDb = async (emailOrPhone: string) => {
  const { data, error } = await supabaseAdmin
    .from("otps")
    .delete()
    .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`);

  if (error) {
    console.error("Error deleting OTP in Supabase:", error);
  }
  return data;
};
