"use client"

import type React from "react"
import { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ResetPasswordModal from "@/components/reset-password-modal"
import { Eye, EyeOff } from "lucide-react"

function ResetPasswordForm() {
    const [email, setEmail] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)

    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    useEffect(() => {
        document.title = "Reset Password"
    }, [])

    // Email validation regex
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/

    // Password validation regex - requires at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

    const validateEmail = (email: string): boolean => {
        if (!email) {
            setError("Email is required.")
            return false
        }
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.")
            return false
        }
        return true
    }

    const validatePassword = (password: string): boolean => {
        if (!password) {
            setError("Password is required.")
            return false
        }
        if (!passwordRegex.test(password)) {
            setError(
                "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
            )
            return false
        }
        return true
    }

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccessMessage("")

        if (!validateEmail(email)) {
            return
        }

        try {
            setIsSubmitting(true)
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })

            const result = await response.json()
            if (response.ok) {
                setSuccessMessage("Reset password link sent to your email.")
            } else {
                setError(result.message || "Failed to send reset link.")
            }
        } catch (err) {
            setError("An error occurred while sending reset link. Please try again.")
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccessMessage("")

        if (!validatePassword(newPassword)) {
            setIsSubmitting(false)
            return
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.")
            setIsSubmitting(false)
            return
        }

        try {
            setIsSubmitting(true)
            const response = await fetch("/api/auth/forgot-password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            })

            const result = await response.json()
            if (response.ok) {
                setSuccessMessage("Password reset successfully.")
                setIsOpen(true)
            } else {
                setError(result.message || "Failed to reset password. Please try again.")
            }
        } catch (err) {
            setError("An error occurred while resetting password. Please try again.")
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleModalClose = () => {
        setIsOpen(false)
        router.push("/sign-in")
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center"></div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
                        {token ? "Reset Your Password" : "Forgot Your Password?"}
                    </h2>

                    {error && <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
                    {successMessage && (
                        <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
                            {successMessage}
                        </div>
                    )}

                    {!token ? (
                        <form className="space-y-6" onSubmit={handleRequestReset}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                    maxLength={254}
                                    pattern={emailRegex.source}
                                    required
                                />
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className="space-y-6" onSubmit={handleResetPassword}>
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="new-password"
                                        name="new-password"
                                        type={isPasswordVisible ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                        minLength={8}
                                        maxLength={128}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                    >
                                        {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    Password must contain at least 8 characters, including uppercase, lowercase, number and special character.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirm-password"
                                        name="confirm-password"
                                        type={isConfirmPasswordVisible ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                        minLength={8}
                                        maxLength={128}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                                    >
                                        {isConfirmPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Resetting..." : "Reset Password"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            <ResetPasswordModal isOpen={isOpen} onClose={() => setIsOpen(false)} onConfirm={handleModalClose} />
        </div>
    )
}

export default function ResetPassword() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}

