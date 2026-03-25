'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { set } from 'mongoose';
import { ArrowLeft, CreditCard, XIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { get } from 'http';
import { toast } from 'react-toastify';
import axios from 'axios';
import dotenv from 'dotenv';
import { signOut } from 'next-auth/react';
import { useAuth } from '@/context/auth-context';
dotenv.config();

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function SubscriptionPage() {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [cardDetails, setCardDetails] = useState<any>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const {user, checkAuth} = useAuth();
    
    const handleCancel = (subscriptionId: string) => {
        setSelectedSubscriptionId(subscriptionId);
        setShowCancelModal(true);
    };

    useEffect(() => {
        document.title = 'Payment'
    }, [])

    const confirmCancel = async () => {
        setIsConfirming(true);
        try {
            const response = await fetch('/api/subscriptions', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriptionId: selectedSubscriptionId }),
            });

            if (!response.ok) {
                throw new Error('Failed to cancel subscription');
            }

            await getSubscriptions();
            await checkAuth(); // Refresh user data to update subscription status
            setShowCancelModal(false);
            toast.success('Subscription cancelled successfully');
        } catch (err) {
            toast.error('Failed to cancel subscription');
        } finally {
            setIsConfirming(false);
        }
    };

    const handleDeleteAccount = async () => {
        // Check if user has an active subscription
        const status = user?.subscriptionStatus;
        if (status === 'active') {
            toast.error("Please cancel your subscription first before deleting your account.");
            setShowDeleteModal(false);
            return;
        }

        try {
            setIsDeleting(true);
            await axios.post("/api/delete-account");
            toast.success(
                "Thanks, customer service will process your request and confirm within 48 hours."
            );
            setShowDeleteModal(false);
        } catch (error) {
            toast.error("Error processing account deletion request");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateCard = async () => {
        try {
            const response = await fetch("/api/payment/create-setup-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const { clientSecret } = await response.json();
            setClientSecret(clientSecret);
        } catch (err) {
            setError("Failed to initiate card update");
        }
    };

    const getSubscriptions = async () => {
        try {
            const response = await fetch('/api/subscriptions', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch subscriptions');
            }

            const data = await response.json();
            setEmail(data.email);
            setSubscriptions(data.subscriptionDetails ? [data.subscriptionDetails] : []);
            setCardDetails(data.card);
        } catch (err: any) {
            setError(err.message || 'Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getSubscriptions();
    }, []);

    const handleSubscribe = async (subscriptionEndDate?: number) => {
        if (subscriptionEndDate) {
            const now = Date.now();
            const endDate = new Date(subscriptionEndDate * 1000);
            
            if (now < endDate.getTime()) {
                const formattedDate = endDate.toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
                toast.error(`You can resubscribe once your current period ends on ${formattedDate}`, {
                    autoClose: 5000,
                });
                return;
            }
        }

        try {
            const response = await fetch("/api/payment/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            console.log('response data:--', data)
            // Refresh auth before redirecting
            await checkAuth();
            window.location = data.url;
            if (error) throw error;
        } catch (err) {
            setError('Subscription failed');
        }
    };

    const handlePause = async (subscriptionId: string) => {
        try {
            const response = await fetch('/api/subscriptions', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriptionId, action: 'pause' }),
            });

            if (!response.ok) {
                throw new Error('Failed to pause subscription');
            }

            const data = await response.json();
            setSubscriptions((prev) =>
                prev.map((sub) =>
                    sub.id === subscriptionId
                        ? { ...sub, status: 'paused' }
                        : sub
                )
            );
            await checkAuth(); // Refresh user data to update subscription status
            toast.success('Subscription paused successfully');
        } catch (err) {
            setError('Failed to pause subscription');
            toast.error('Failed to pause subscription');
        }
    };

    const handleResume = async (subscriptionId: string) => {
        try {
            const response = await fetch('/api/subscriptions', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriptionId, action: 'resume' }),
            });

            if (!response.ok) {
                throw new Error('Failed to resume subscription');
            }

            const data = await response.json();
            setSubscriptions((prev) =>
                prev.map((sub) =>
                    sub.id === subscriptionId
                        ? { ...sub, status: 'active' }
                        : sub
                )
            );
            await checkAuth(); // Refresh user data to update subscription status
            toast.success('Subscription resumed successfully');
        } catch (err) {
            setError('Failed to resume subscription');
            toast.error('Failed to resume subscription');
        }
    };


    if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-600">Error: {error}</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            {isUpdating && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold mb-4">Updating Payment Method...</h3>
                        <p className="text-gray-600">Please wait...</p>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Subscription Management</h1>
                            <p className="text-gray-600 mt-1 text-sm">Manage your subscriptions and payment methods</p>
                        </div>
                        <button
                            onClick={() => router.push('/account')}
                            className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors shadow-md w-full sm:w-auto whitespace-nowrap"
                        >
                            <ArrowLeft size={18} />
                            <span>Back to Account</span>
                        </button>
                    </div>
                </div>

                {/* Active Subscriptions */}
                <div className="mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Active Subscriptions</h2>
                    {subscriptions?.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                            <p className="text-gray-600">No active subscriptions</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {subscriptions?.map((sub) => {
                                const activeUntil = sub?.current_period_end;

                                return (
                                    <div key={sub.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                        {/* Subscription Info */}
                                        <div className="p-4 sm:p-6">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
                                                <div className="flex-1">
                                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{sub.plan?.nickname || 'Eatinout'}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        £{sub.plan?.amount / 100 || 'N/A'}/{sub.plan?.amount /100 === 4.99 ? "Monthly" : sub.plan?.amount /100 === 29.94 ? "6 Months" : sub.plan?.amount /100 === 59.88 ? "Annual" : sub.plan?.amount /100 === 89.82 ? "18 Months" : "N/A"}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {(() => {
                                                        const now = Date.now();
                                                        const endDate = new Date(sub.current_period_end * 1000);
                                                        const status = user?.subscriptionStatus || sub.status;
                                                        
                                                        if (status === 'canceled' || status === 'cancelled') {
                                                            return (
                                                                <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                                                                    Cancelled
                                                                </span>
                                                            );
                                                        }
                                                        
                                                        if (status === 'inactive' || now > endDate.getTime()) {
                                                            return (
                                                                <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                                                                    Expired
                                                                </span>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                                                                Active
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Status Details */}
                                            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-6">
                                                {(() => {
                                                    const now = Date.now();
                                                    const endDate = new Date(sub.current_period_end * 1000);
                                                    const formattedDate = endDate.toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    });
                                                    const status = user?.subscriptionStatus || sub.status;
                                                    
                                                    if (status === 'canceled' || status === 'cancelled') {
                                                        return (
                                                            <p className="text-xs sm:text-sm text-gray-700">
                                                                Valid until <strong>{formattedDate}</strong>
                                                            </p>
                                                        );
                                                    }
                                                    
                                                    if (status === 'inactive' || now > endDate.getTime()) {
                                                        return (
                                                            <p className="text-xs sm:text-sm text-gray-700">
                                                                This subscription has expired
                                                            </p>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <p className="text-xs sm:text-sm text-gray-700">
                                                            Renews on <strong>{formattedDate}</strong>
                                                        </p>
                                                    );
                                                })()}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                                {(() => {
                                                    const status = user?.subscriptionStatus || sub.status;
                                                    
                                                    if (status === 'active') {
                                                        return (
                                                            <button
                                                                onClick={() => handleCancel(sub.id)}
                                                                className="flex-1 border border-red-500 text-red-600 bg-transparent px-3 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
                                                            >
                                                                Cancel
                                                            </button>
                                                        );
                                                    }
                                                    
                                                    if (status === 'paused') {
                                                        return (
                                                            <button
                                                                onClick={() => handleResume(sub.id)}
                                                                className="flex-1 border border-blue-500 text-blue-600 bg-transparent px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                                                            >
                                                                Resume
                                                            </button>
                                                        );
                                                    }
                                                    
                                                    return null;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Subscribe Again Button - Full Width at Bottom */}
                                        {(() => {
                                            const status = user?.subscriptionStatus || sub.status;
                                            if (status === 'canceled' || status === 'cancelled') {
                                                return (
                                                    <div className="bg-blue-50 border-t border-blue-200 px-4 sm:px-6 py-3">
                                                        <button
                                                            onClick={() => handleSubscribe(sub.current_period_end)}
                                                            className="w-full border border-blue-500 text-blue-600 bg-transparent px-4 py-2 rounded-lg hover:bg-blue-50 transition-all font-medium text-sm"
                                                        >
                                                            Subscribe Again
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Payment Method Details */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Payment Method</h2>
                    {cardDetails ? (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-blue-100 p-3 rounded-lg">
                                    <CreditCard className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{cardDetails.brand?.toUpperCase()}</p>
                                    <p className="text-sm text-gray-600">**** **** **** {cardDetails.last4}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 mb-2">
                                <p className="text-sm text-gray-700">
                                    Expires: <strong>{cardDetails.expMonth}/{cardDetails.expYear}</strong>
                                </p>
                            </div>
                            <button
                                onClick={handleUpdateCard}
                                className="border border-blue-500 text-blue-600 bg-transparent px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                            >
                                Update Card
                            </button>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                            <p className="text-gray-600">No payment method on file</p>
                        </div>
                    )}
                </div>

                {/* Delete Account Section */}
                <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Account</h2>
                    <p className="text-xs text-gray-600 mb-4">
                        Permanently delete your account and all associated data.
                    </p>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 border border-red-500 text-red-600 bg-transparent px-4 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Your Account
                    </button>
                </div>
            </div>

            {/* Update Card Modal */}
            {clientSecret && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Update Payment Method</h3>
                        <Elements stripe={stripePromise}>
                            <CardUpdateForm
                                clientSecret={clientSecret}
                                email={email}
                                setClientSecret={setClientSecret}
                                setIsUpdating={setIsUpdating}
                                getSubscriptions={getSubscriptions}
                            />
                        </Elements>
                        <button
                            onClick={() => setClientSecret(null)}
                            className="mt-4 w-full text-sm text-gray-600 hover:text-gray-800 py-2 rounded transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 sm:p-8 rounded-lg w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Cancel Subscription</h3>
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                            >
                                <span className="sr-only">Close</span>
                                <XIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">Important Information</h4>
                                <p className="text-xs sm:text-sm text-red-800">Please review the cancellation terms below</p>
                            </div>

                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
                                <p><strong>1. Billing Period:</strong> Your subscription will remain active until the end of your current billing period.</p>

                                <p><strong>2. Access to Services:</strong> You will continue to have full access to all features until the end of the paid period.</p>

                                <p><strong>3. Refund Policy:</strong> No refunds will be issued for the remaining days in the current billing period.</p>

                                <p><strong>4. Data Retention:</strong> Your account data will be retained for 30 days after cancellation.</p>

                                <p><strong>5. Reactivation:</strong> You can reactivate your subscription at any time, but a new billing cycle will begin.</p>
                            </div>

                            <p className="text-xs sm:text-sm text-gray-600 italic">
                                By clicking "Confirm Cancellation", you acknowledge that you have read and agree to these terms.
                            </p>
                        </div>

                        <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 bg-transparent hover:bg-gray-50 rounded-lg transition-colors font-medium"
                            >
                                Keep Subscription
                            </button>
                            <button
                                onClick={confirmCancel}
                                disabled={isConfirming}
                                className={`px-4 py-2 text-sm border border-red-500 text-red-600 bg-transparent hover:bg-red-50 rounded-lg transition-colors font-medium ${
                                    isConfirming ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {isConfirming ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </div>
                                ) : (
                                    'Confirm Cancellation'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 sm:p-8 rounded-lg w-full max-w-md shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Delete Account</h3>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                            >
                                <span className="sr-only">Close</span>
                                <XIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {user?.subscriptionStatus === 'active' && (
                                <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
                                    <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Active Subscription</h4>
                                    <p className="text-sm text-yellow-800">
                                        Please note: You need to cancel your subscription first before deleting your account.
                                    </p>
                                </div>
                            )}
                            
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <h4 className="font-semibold text-red-900 mb-2">Are you sure?</h4>
                                <p className="text-sm text-red-800">
                                    Thanks, customer service will process your request and confirm within 48 hours. 
                                    Your information will be deleted from Eatinout.
                                </p>
                            </div>

                            <p className="text-sm text-gray-600">
                                This action cannot be undone. All your data, including your subscription history, 
                                wallet offers, and personal information will be permanently deleted.
                            </p>
                        </div>

                        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 bg-transparent hover:bg-gray-50 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className={`flex items-center justify-center gap-2 px-4 py-2 text-sm border border-red-500 text-red-600 bg-transparent hover:bg-red-50 rounded-lg transition-colors font-medium ${
                                    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {isDeleting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" />
                                        Yes, Delete Account
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


const CardUpdateForm = ({
    clientSecret,
    setClientSecret,
    email,
    setIsUpdating,
    getSubscriptions
}: {
    clientSecret: string;
    setClientSecret: React.Dispatch<React.SetStateAction<string | null>>;
    email: string;
    setIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
    getSubscriptions: () => Promise<void>;
}) => {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        if (!stripe || !elements) return;

        const cardElement = elements.getElement(CardElement);

        const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: {
                card: cardElement!,
                billing_details: {
                    email,
                },
            },
        });

        if (error) {
            console.error("Error updating card:", error.message);
            alert("Failed to update card");
        } else {
            alert("Card updated successfully!");
            setClientSecret(null);
        }
        await getSubscriptions();
        setIsUpdating(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <CardElement className="p-3 border border-gray-300 rounded-lg" />
            <button
                type="submit"
                className="w-full border border-green-500 text-green-600 bg-transparent px-4 py-2 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm"
            >
                Update Card
            </button>
        </form>
    );
};