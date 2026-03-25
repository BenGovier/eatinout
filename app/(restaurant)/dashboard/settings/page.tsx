"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Edit, Trash2, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    role: "",
    _id: "",
  });

  const [originalProfile, setOriginalProfile] = useState({});
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);

  // OTP States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpProcessing, setIsOtpProcessing] = useState(false);
  const [isOtpRequested, setIsOtpRequested] = useState(false);

  // Fetch Profile Initially
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/restaurant/profile");
        const data = res.data.restaurant;
        setProfile(data);
        setOriginalProfile(data);
      } catch {
        toast.error("Error loading profile");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Form Validation
  const validateForm = () => {
    const newErr = {};

    if (!profile.firstName.trim()) newErr.firstName = "First name required";
    if (!profile.lastName.trim()) newErr.lastName = "Last name required";

    if (!profile.email.trim()) newErr.email = "Email required";
    else if (!/\S+@\S+\.\S+$/.test(profile.email)) newErr.email = "Invalid email";

    if (profile.mobile && !/^\d{10}$/.test(profile.mobile))
      newErr.mobile = "Mobile must be 10 digits";

    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleInputChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  // Save profile (no email change)
  const saveProfileWithoutEmailChange = async () => {
    try {
      setIsProcessingUpdate(true);

      await axios.put(`/api/restaurant/profile/${profile._id}`, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        mobile: profile.mobile,
      });

      setOriginalProfile(profile);
      toast.success("Profile updated");
      setIsEditing(false);
    } catch (e) {
      toast.error("Update failed");
    } finally {
      setIsProcessingUpdate(false);
    }
  };

  // Request OTP
  const requestEmailOtp = async (email) => {
    try {
      await axios.post("/api/restaurant/request-email-change", {
        newEmail: email,
        userId: profile._id,
      });

      setNewEmail(email);
      setShowOtpModal(true);
      setIsOtpRequested(true);

      toast.success("OTP sent to new email");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to send OTP");
      setIsOtpRequested(false);
      setIsProcessingUpdate(false);
    }
  };

  // Verify OTP
  const verifyEmailOtp = async () => {
    try {
      setIsOtpProcessing(true);

      await axios.post("/api/restaurant/verify-email-change", {
        otp,
        newEmail,
        userId: profile._id,
      });

      toast.success("Email updated!");
      setShowOtpModal(false);

      setProfile({ ...profile, email: newEmail });
      // setOriginalProfile({ ...originalProfile, email: newEmail });
      setOriginalProfile((prev) => ({
        ...prev,
        email: newEmail.trim().toLowerCase(),
      }));

      setIsOtpRequested(false);
      setIsProcessingUpdate(false);
      setIsEditing(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Invalid OTP");
    } finally {
      setIsOtpProcessing(false);
    }
  };

  // Main save handler
  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    const emailChanged = profile.email !== originalProfile.email;

    if (emailChanged) {
      setIsProcessingUpdate(true);
      await requestEmailOtp(profile.email);
      return;
    }

    saveProfileWithoutEmailChange();
  };

  const handleCancelEdit = () => {
    setProfile(originalProfile);
    setIsEditing(false);
    setErrors({});
  };

  const handleDeleteAccount = async () => {
    try {
      await axios.post("/api/delete-account");
      toast.success("Request submitted");
      setOpenDeleteDialog(false);
    } catch {
      toast.error("Error deleting account");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <div className="h-10 w-10 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold">Settings</h1>

        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
        )}
      </div>

      {/* PROFILE CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isEditing ? (
            <>
              <ProfileRow label="First Name" value={profile.firstName} />
              <ProfileRow label="Last Name" value={profile.lastName} />
              <ProfileRow label="Email" value={profile.email} />
              {/* <ProfileRow label="Mobile" value={profile.mobile || "_"} /> */}
              <ProfileRow label="Role" value={profile.role} />
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
              <Field
                label="First Name"
                name="firstName"
                value={profile.firstName}
                onChange={handleInputChange}
                error={errors.firstName}
              />

              <Field
                label="Last Name"
                name="lastName"
                value={profile.lastName}
                onChange={handleInputChange}
                error={errors.lastName}
              />

              <Field
                label="Email"
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                error={errors.email}
                className="sm:col-span-2"
                type="email"
              />

              {/* <Field
                label="Mobile"
                name="mobile"
                value={profile.mobile}
                onChange={handleInputChange}
                error={errors.mobile}
              /> */}
            </div>
          )}
        </CardContent>

        {/* OTP ABOVE BUTTONS */}
        {isEditing && showOtpModal && (
          <div className="px-6 pb-4">
            <p className="text-sm mb-2 text-center">
              Enter the OTP sent to <b>{newEmail}</b>
            </p>

            <div className="flex justify-center">
              <InputOTP maxLength={6} onChange={(value) => setOtp(String(value))}>
                <InputOTPGroup>
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
        )}

        {/* SAVE / CANCEL OR VERIFY OTP */}
        {isEditing && (
          <CardFooter className="flex justify-end gap-4">
            {/* <Button variant="outline" onClick={handleCancelEdit} disabled={isProcessingUpdate}>
              Cancel
            </Button> */}
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>

            {!showOtpModal ? (
              <Button onClick={handleUpdateProfile} disabled={isProcessingUpdate}>
                {/* {isProcessingUpdate ? "Sending OTP..." : "Save Changes"} */}
                {isProcessingUpdate && profile.email !== originalProfile.email
                  ? "Sending OTP..."
                  : isProcessingUpdate
                    ? "Updating..."
                    : "Save Changes"}
              </Button>
            ) : (
              <Button
                onClick={verifyEmailOtp}
                disabled={otp.length !== 6 || isOtpProcessing}
              >
                {isOtpProcessing ? "Verifying..." : "Verify OTP"}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* DELETE ACCOUNT */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Manage account settings</CardDescription>
        </CardHeader>

        <CardContent>
          <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  Support team will review your request within 48 hours.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

/* SMALL COMPONENTS */
function ProfileRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Field({ label, error, ...props }) {
  return (
    <div className="flex flex-col space-y-1">
      <Label>{label}</Label>
      <Input {...props} className={error && "border-red-500"} />
      {error && (
        <p className="text-xs text-red-500 flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" /> {error}
        </p>
      )}
    </div>
  );
}
