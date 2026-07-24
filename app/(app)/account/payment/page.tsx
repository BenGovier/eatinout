'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { ArrowLeft, CreditCard, XIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '@/context/auth-context';
import { SubscriptionSummaryCard } from '@/components/account/subscription-summary-card';
import { CancellationWizard } from '@/components/account/cancellation-wizard';
import {
    type NormalizedSubscription,
    formatUKDate,
    subscriptionSegment,
} from '@/lib/subscription';
import { trackSubscriptionEvent } from '@/lib/subscription-analytics';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Minimal legacy shape kept only for backwards compatibility when a response
// predates the nested normalized `subscription` object.
interface LegacyInfo {
    status: string;
    hasAccess: boolean;
    isTrialing: boolean;
    currentPeriodEndDate: string | null;
    trialEndDate: string | null;
}

export default function SubscriptionPage() {
    const [subscription, setSubscription] = useState<NormalizedSubscription | null>(null);
    const [legacy, setLegacy] = useState<LegacyInfo | null>(null);
    const [loading, setLoading] = useState(true);
    // Distinguishes a failed GET (loadError) from genuine inactivity (no data).
    const [loadError, setLoadError] = useState(false);
    const [email, setEmail] = useState('');
    const [cardDetails, setCardDetails] = useState<NormalizedSubscription['paymentMethod']>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showCancelWizard, setShowCancelWizard] = useState(false);
    const [reactivating, setReactivating] = useState(false);
    const router = useRouter();
    const { user, checkAuth } = useAuth();

    useEffect(() => {
        document.title = 'Your membership';
    }, []);

    // Fire manage_subscription_opened exactly once per genuine page open.
    // The ref guard prevents duplicates from rerenders or data refreshes.
    const openedTracked = useRef(false);
    useEffect(() => {
        if (openedTracked.current) return;
        openedTracked.current = true;
        trackSubscriptionEvent('manage_subscription_opened');
    }, []);

    // Stable fetch: refreshes normalized subscription, email and card details.
    // On failure it sets loadError WITHOUT wiping any previously loaded state,
    // so a failed mutation-refresh preserves the current display.
    const getSubscriptions = useCallback(async () => {
        try {
            const res = await axios.get('/api/subscriptions');
            const data = res.data ?? {};
            setEmail(data.email ?? '');
            setCardDetails(data.card ?? null);

            const normalized: NormalizedSubscription | null = data.subscription ?? null;
            if (normalized) {
                setSubscription(normalized);
                setLegacy(null);
            } else if (data.subscriptionDetails) {
                // Legacy fallback: nested object missing but legacy info present.
                setSubscription(null);
                setLegacy({
                    status: data.status ?? 'unknown',
                    hasAccess: Boolean(data.hasAccess),
                    isTrialing: Boolean(data.isTrialing),
                    currentPeriodEndDate: data.currentPeriodEndDate ?? null,
                    trialEndDate: data.trialEndDate ?? null,
                });
            } else {
                // Genuine inactivity: request succeeded, no membership exists.
                setSubscription(null);
                setLegacy(null);
            }
            setLoadError(false);
        } catch {
            // Never present the customer as inactive on a request failure.
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Refresh subscription data AND auth after any state-changing action.
    const refreshAll = useCallback(async () => {
        await getSubscriptions();
        await checkAuth();
    }, [getSubscriptions, checkAuth]);

    useEffect(() => {
        getSubscriptions();
    }, [getSubscriptions]);

    const handleReactivate = useCallback(async () => {
        if (reactivating) return; // prevent duplicate requests
        setReactivating(true);
        try {
            const res = await axios.patch('/api/subscriptions', { action: 'reactivate' });
            // Fire cancellation_reversed only after a successful PATCH, once, no PII.
            trackSubscriptionEvent('cancellation_reversed', {
                subscription_segment: subscriptionSegment(subscription),
                billing_interval: subscription?.billingInterval ?? null,
            });
            toast.success(res.data?.message || 'Your membership has been reactivated.');
            await refreshAll();
        } catch (err: any) {
            // Preserve the current display on failure.
            toast.error(
                err?.response?.data?.error ||
                "We couldn't reactivate your membership. Please try again."
            );
        } finally {
            setReactivating(false);
        }
    }, [reactivating, subscription, refreshAll]);

    // Restart checkout. Preserves the guard against starting a second checkout
    // while paid access still remains.
    const handleRestart = useCallback(async () => {
        const endIso = subscription?.accessEndDate || subscription?.currentPeriodEnd || null;
        if (subscription?.hasAccess && endIso) {
            const endMs = new Date(endIso).getTime();
            if (!Number.isNaN(endMs) && Date.now() < endMs) {
                toast.error(
                    `You can resubscribe once your current period ends on ${formatUKDate(endIso)}`,
                    { autoClose: 5000 }
                );
                return;
            }
        }

        try {
            const response = await fetch('/api/payment/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            // Refresh auth before redirecting to checkout.
            await checkAuth();
            window.location.href = data.url;
        } catch {
            toast.error('Subscription failed');
        }
    }, [subscription, email, checkAuth]);

    const handleDeleteAccount = async () => {
        // Active members must cancel before deleting their account.
        const status = user?.subscriptionStatus;
        if (status === 'active') {
            toast.error('Please cancel your subscription first before deleting your account.');
            setShowDeleteModal(false);
            return;
        }

        try {
            setIsDeleting(true);
            await axios.post('/api/delete-account');
            toast.success(
                'Thanks, customer service will process your request and confirm within 48 hours.'
            );
            setShowDeleteModal(false);
        } catch (error) {
            toast.error('Error processing account deletion request');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateCard = async () => {
        try {
            const response = await fetch('/api/payment/create-setup-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const { clientSecret } = await response.json();
            setClientSecret(clientSecret);
        } catch (err) {
            toast.error('Failed to initiate card update');
        }
    };

    // Cancel trigger is shown only for a live membership that can still be
    // cancelled: has access, not already scheduled, and currently trialing or
    // active (never expired / inactive / fully cancelled / scheduled).
    const canCancel =
        !!subscription &&
        subscription.hasAccess &&
        !subscription.cancelAtPeriodEnd &&
        (subscription.effectiveStatus === 'trialing' ||
            subscription.effectiveStatus === 'active');

    if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

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
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your membership</h1>
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

                {/* Membership */}
                <div className="mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Membership</h2>

                    {subscription ? (
                        <SubscriptionSummaryCard
                            subscription={subscription}
                            showManage={false}
                            onExplore={() => router.push('/restaurants')}
                            onKeepMembership={handleReactivate}
                            onRestart={handleRestart}
                            reactivating={reactivating}
                        />
                    ) : legacy ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {legacy.isTrialing
                                            ? 'Free trial'
                                            : legacy.status === 'cancelled' ||
                                                legacy.status === 'cancelled_with_access'
                                                ? 'Cancelled'
                                                : legacy.hasAccess
                                                    ? 'Active'
                                                    : 'Membership'}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {legacy.isTrialing && legacy.trialEndDate
                                            ? `Trial ends on ${formatUKDate(legacy.trialEndDate)}`
                                            : legacy.currentPeriodEndDate
                                                ? `Access until ${formatUKDate(legacy.currentPeriodEndDate)}`
                                                : 'We could only load limited membership details.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => getSubscriptions()}
                                    className="border border-gray-300 text-gray-700 bg-transparent px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm w-full sm:w-auto"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : loadError ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                            <p className="text-gray-700 mb-4">We couldn&apos;t load your membership details.</p>
                            <button
                                onClick={() => getSubscriptions()}
                                className="border border-red-500 text-red-600 bg-transparent px-4 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
                            >
                                Try again
                            </button>
                        </div>
                    ) : (
                        // Genuine inactive: request succeeded, no membership exists.
                        <SubscriptionSummaryCard
                            subscription={null}
                            showManage={false}
                            onExplore={() => router.push('/restaurants')}
                            onKeepMembership={handleReactivate}
                            onRestart={handleRestart}
                            reactivating={reactivating}
                        />
                    )}

                    {/* Low-emphasis cancel trigger */}
                    {canCancel && (
                        <div className="mt-3 text-center sm:text-left">
                            <button
                                onClick={() => setShowCancelWizard(true)}
                                className="text-sm text-gray-500 underline underline-offset-4 hover:text-gray-700 transition-colors"
                            >
                                Cancel membership
                            </button>
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

            {/* Cancellation wizard (controlled). Only mounted with normalized data. */}
            {subscription && (
                <CancellationWizard
                    open={showCancelWizard}
                    onOpenChange={setShowCancelWizard}
                    subscription={subscription}
                    onChanged={refreshAll}
                    contactHref="/account/contact"
                />
            )}

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
                                className={`flex items-center justify-center gap-2 px-4 py-2 text-sm border border-red-500 text-red-600 bg-transparent hover:bg-red-50 rounded-lg transition-colors font-medium ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''
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
