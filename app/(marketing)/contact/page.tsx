"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Building2, User, Calendar, MessageSquare } from "lucide-react"
import { toast } from "react-toastify"
import { InlineWidget } from "react-calendly";

type Step = "select" | "restaurant" | "user"
type RestaurantAction = "calendly" | "message" | null

export default function ContactPage() {
    const [step, setStep] = useState<Step>("select")
    const [restaurantAction, setRestaurantAction] = useState<RestaurantAction>(null)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        restaurantName: "",
        contactName: "",
        email: "",
        phone: "",
        location: "",
        message: "",
        enquiryType: "",
        userName: "",
        userEmail: "",
        userMessage: "",
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Reset wizard
    const resetWizard = () => {
        setStep("select")
        setRestaurantAction(null)
        setForm({
            restaurantName: "",
            contactName: "",
            email: "",
            phone: "",
            location: "",
            message: "",
            enquiryType: "",
            userName: "",
            userEmail: "",
            userMessage: "",
        })
        setErrors({})
    }

    // Input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target
        if (id === "phone") {
            const numericValue = value.replace(/\D/g, "")
            setForm({ ...form, [id]: numericValue.slice(0, 12) })
        } else {
            setForm({ ...form, [id]: value })
        }
        if (errors[id]) {
            const newErrors = { ...errors }
            delete newErrors[id]
            setErrors(newErrors)
        }
    }

    // Validation helpers
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const validatePhone = (phone: string) => /^[0-9]{10,12}$/.test(phone)

    // Form validation
    const validateForm = (type: "restaurant" | "user") => {
        const newErrors: Record<string, string> = {}
        if (type === "restaurant") {
            if (!form.restaurantName.trim()) newErrors.restaurantName = "Restaurant name is required"
            if (!form.contactName.trim()) newErrors.contactName = "Contact name is required"
            if (!form.email.trim()) newErrors.email = "Email is required"
            else if (!validateEmail(form.email)) newErrors.email = "Invalid email format"
            if (!form.phone.trim()) newErrors.phone = "Phone number is required"
            else if (!validatePhone(form.phone)) newErrors.phone = "Phone number must be 10-12 digits"
            if (!form.location.trim()) newErrors.location = "Location is required"
            if (!form.message.trim()) newErrors.message = "Message is required"
        }
        if (type === "user") {
            if (!form.userName.trim()) newErrors.userName = "Name is required"
            if (!form.userEmail.trim()) newErrors.userEmail = "Email is required"
            else if (!validateEmail(form.userEmail)) newErrors.userEmail = "Invalid email format"
            if (!form.enquiryType.trim()) newErrors.enquiryType = "Enquiry type is required"
            if (!form.userMessage.trim()) newErrors.userMessage = "Message is required"
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Handle submit
    const handleSubmit = async (type: "restaurant" | "user") => {
        if (!validateForm(type)) return
        setLoading(true)
        try {
            const res = await fetch("/api/send-contact-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    name: type === "restaurant" ? form.contactName : form.userName,
                    email: type === "restaurant" ? form.email : form.userEmail,
                    phone: form.phone,
                    restaurantName: form.restaurantName,
                    location: form.location,
                    enquiryType: form.enquiryType,
                    message: type === "restaurant" ? form.message : form.userMessage,
                }),
            })
            const data = await res.json()
            if (res.ok && data.success) {
                toast.success(data.message || "Email sent successfully!")
                resetWizard()
            } else {
                toast.error(data.message || "Failed to send email.")
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Back to start button */}
                {step !== "select" && (
                    <Button variant="ghost" onClick={resetWizard} className="mb-6 text-gray-600 hover:text-red-600 flex items-center">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to start
                    </Button>
                )}

                {/* Step 1: Selection */}
                {step === "select" && (
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                            Whether you're a restaurant/venue looking to partner with us or need support, we're here to help
                        </p>

                        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                            <Card onClick={() => setStep("restaurant")} className="cursor-pointer hover:shadow-lg border-2 hover:border-red-200 transition-all">
                                <CardHeader className="text-center pb-4">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Building2 className="w-8 h-8 text-red-600" />
                                    </div>
                                    <CardTitle className="text-xl">Restaurant/Venue</CardTitle>
                                    <CardDescription>Partner with us to reach more customers</CardDescription>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white mt-4">Continue</Button>
                                </CardContent>
                            </Card>

                            <Card onClick={() => setStep("user")} className="cursor-pointer hover:shadow-lg border-2 hover:border-red-200 transition-all">
                                <CardHeader className="text-center pb-4">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <User className="w-8 h-8 text-red-600" />
                                    </div>
                                    <CardTitle className="text-xl">User</CardTitle>
                                    <CardDescription>Get support or ask questions</CardDescription>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white mt-4">Continue</Button>
                                </CardContent>
                            </Card>
                        </div>
                        <Link
                            href="/"
                            className="text-red-600 hover:text-red-700 hover:underline mt-4 inline-block"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                )}

                {/* Restaurant Step */}
                {step === "restaurant" && (
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Restaurant/Venue Partnership</h2>
                            <p className="text-lg text-gray-600">Choose how you'd like to get started with eatinout</p>
                        </div>
                        {!restaurantAction ? (
                            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                                {/* <Card
                                    onClick={() => setRestaurantAction("calendly")}
                                    className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-red-200"
                                >
                                    <CardHeader className="text-center pb-4">
                                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Calendar className="w-8 h-8 text-red-600" />
                                        </div>
                                        <CardTitle className="text-xl">Book Discovery Call</CardTitle>
                                        <CardDescription>Schedule a 30-minute call to discuss partnership opportunities</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Continue</Button>
                                    </CardContent>
                                </Card> */}

                                <Card
                                    onClick={() => setRestaurantAction("message")}
                                    className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-red-200"
                                >
                                    <CardHeader className="text-center pb-4">
                                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <MessageSquare className="w-8 h-8 text-red-600" />
                                        </div>
                                        <CardTitle className="text-xl">Send Message</CardTitle>
                                        <CardDescription>Send us a message with your questions or requirements</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Continue</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : restaurantAction === "calendly" ? (
                            <Card className="max-w-2xl mx-auto">
                                <CardHeader>
                                    <CardTitle>Book Your Discovery Call</CardTitle>
                                    <CardDescription>
                                        Schedule a call with our partnership team to discuss how eatinout can help grow your business
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                                        <Calendar className="w-12 h-12 text-red-600 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-4"> Choose a convenient time below to book your call with our team.</p>
                                        {/* <Button className="bg-red-600 hover:bg-red-700 text-white">Open Calendly Scheduler</Button> */}
                                        <a
                                            href="https://calendly.com/nandani-antheminfotech/new-meeting"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button className="bg-red-600 hover:bg-red-700 text-white">Book Your Discovery Call</Button>
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="max-w-2xl mx-auto">
                                <CardHeader>
                                    <CardTitle>Restaurant/Venue Partnership Enquiry</CardTitle>
                                    <CardDescription>Tell us about your restaurant/venue and how we can help you grow</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid lg:grid-cols-2 sm:grid-cols-1 gap-4">
                                        <div>
                                            <Label htmlFor="restaurantName">Restaurant/Venue Name</Label>
                                            <Input
                                                id="restaurantName"
                                                placeholder="Your restaurant name"
                                                value={form.restaurantName}
                                                onChange={handleChange}
                                                className={errors.restaurantName ? "border-red-500" : ""}
                                            />
                                            {errors.restaurantName && <p className="text-red-500 text-sm">{errors.restaurantName}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="contactName">Contact Name</Label>
                                            <Input
                                                id="contactName"
                                                placeholder="Your name"
                                                value={form.contactName}
                                                onChange={handleChange}
                                                className={errors.contactName ? "border-red-500" : ""}
                                            />
                                            {errors.contactName && <p className="text-red-500 text-sm">{errors.contactName}</p>}
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-2 sm:grid-cols-1 gap-4">
                                        <div>
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="your@email.com"
                                                value={form.email}
                                                onChange={handleChange}
                                                className={errors.email ? "border-red-500" : ""}
                                            />
                                            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">Phone</Label>
                                            <Input
                                                id="phone"
                                                placeholder="Your phone number"
                                                value={form.phone}
                                                onChange={handleChange}
                                                className={errors.phone ? "border-red-500" : ""}
                                            />
                                            {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="location">Location</Label>
                                        <Input
                                            id="location"
                                            placeholder="Restaurant location/area"
                                            value={form.location}
                                            onChange={handleChange}
                                            className={errors.location ? "border-red-500" : ""}
                                        />
                                        {errors.location && <p className="text-red-500 text-sm">{errors.location}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="message">Tell us about your restaurant/venue</Label>
                                        <Textarea
                                            id="message"
                                            placeholder="Describe your restaurant, cuisine type, current challenges, and how eatinout can help..."
                                            rows={4}
                                            value={form.message}
                                            onChange={handleChange}
                                            className={errors.message ? "border-red-500" : ""}
                                        />
                                        {errors.message && <p className="text-red-500 text-sm">{errors.message}</p>}
                                    </div>

                                    <Button
                                        disabled={loading}
                                        onClick={() => handleSubmit("restaurant")}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {loading ? "Sending..." : "Send Partnership Enquiry"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* User Step */}
                {step === "user" && (
                    <div>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">User Support</h2>
                            <p className="text-lg text-gray-600">We're here to help with any questions or issues</p>
                        </div>

                        <Card className="max-w-2xl mx-auto">
                            <CardHeader>
                                <CardTitle>Contact Support</CardTitle>
                                <CardDescription>Please provide details about your enquiry</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid lg:grid-cols-2 sm:grid-cols-1 gap-4">
                                    <div>
                                        <Label htmlFor="userName">Name</Label>
                                        <Input
                                            id="userName"
                                            value={form.userName}
                                            onChange={handleChange}
                                            placeholder="Your name"
                                            className={errors.userName ? "border-red-500" : ""}
                                        />
                                        {errors.userName && <p className="text-red-500 text-sm">{errors.userName}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="userEmail">Email</Label>
                                        <Input
                                            id="userEmail"
                                            type="email"
                                            value={form.userEmail}
                                            onChange={handleChange}
                                            placeholder="your@email.com"
                                            className={errors.userEmail ? "border-red-500" : ""}
                                        />
                                        {errors.userEmail && <p className="text-red-500 text-sm">{errors.userEmail}</p>}
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="enquiryType">Enquiry Type</Label>
                                    <Select onValueChange={(v) => setForm({ ...form, enquiryType: v })}>
                                        <SelectTrigger className={errors.enquiryType ? "border-red-500" : ""}>
                                            <SelectValue placeholder="Select enquiry type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="account">Account Issues</SelectItem>
                                            <SelectItem value="billing">Billing Questions</SelectItem>
                                            <SelectItem value="technical">Technical Support</SelectItem>
                                            <SelectItem value="feedback">Feedback</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.enquiryType && <p className="text-red-500 text-sm">{errors.enquiryType}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="userMessage">Message</Label>
                                    <Textarea
                                        id="userMessage"
                                        rows={2}
                                        value={form.userMessage}
                                        onChange={handleChange}
                                        className={errors.userMessage ? "border-red-500" : ""}
                                        placeholder="Please describe your issue or question..."
                                    />
                                    {errors.userMessage && <p className="text-red-500 text-sm">{errors.userMessage}</p>}
                                </div>

                                <Button
                                    disabled={loading}
                                    onClick={() => handleSubmit("user")}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {loading ? "Sending..." : "Send Message"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}