import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleForgotPassword = async () => {
        if (!email) {
            toast.error("Please enter your email.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                toast.success("Reset password link sent to your email.");
                onClose(); // Close the modal
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to send reset password link.");
            }
        } catch (error) {
            console.error("Error sending reset password link:", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
            setEmail('')
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Forgot Password</h2>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleForgotPassword} disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : "Send Reset Link"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}