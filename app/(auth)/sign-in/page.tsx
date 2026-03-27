"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react"; // Import useSession
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import { checkFirstLoginOnDevice } from "@/lib/deviceLogin";
import { useAuth } from "@/context/auth-context";
import { Spinner } from "@/components/ui/spinner";

export default function SignInPage() {
  const { setAuthState } = useAuth();
  const { data: session, status }: any = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRestaurants = searchParams.get("fromRestaurants") === "true";
  const redirectUrl =
    searchParams.get("redirect") ?? searchParams.get("returnTo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // State for password visibility
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isPending, setIsPending] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(true);

  const restaurantId = searchParams.get("restaurantId");

  const handleForgotPasswordOpen = () => setIsForgotPasswordOpen(true);
  const handleForgotPasswordClose = () => setIsForgotPasswordOpen(false);
  useEffect(() => {
    document.title = "Sign In"
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/verify-token", {
          method: "POST",
        });
        const data = await response.json();

        if (response.ok) {
          const user = data.user;
          if (user?.role === "admin") {
            router.push("/admin/dashboard");
          } else if (user?.role === "restaurant") {
            router.push("/dashboard");
          } else if (user?.role === "user") {
            // For users, check subscription access
            try {
              const subscriptionData = await fetchProfileAndSubscription();
              if (subscriptionData.hasAccess) {
                router.push("/restaurants");
              } else {
                console.log("No access during auth check:", subscriptionData.accessReason);
                // Stay on sign-in page - they'll need to renew subscription
              }
            } catch (err) {
              console.error("Error checking subscription during auth check:", err);
            }
          }
        }
        setIsPending(false);
      } catch (err) {
        router.push("/sign-in");
        console.error("Auth check error:", err);
        setIsPending(false);
      }
    };
    checkAuth();
  }, []);

  const fetchProfileAndSubscription = async (): Promise<{ periodEnd: number, hasAccess: boolean, accessReason: string }> => {
    try {
      const subRes = await fetch("/api/subscriptions");
      const sub = await subRes.json();

      // Use trial_end if available, otherwise use current_period_end
      const periodEnd = sub?.subscriptionDetails?.trial_end || sub?.subscriptionDetails?.current_period_end || 0;
      const hasAccess = sub?.hasAccess || false;
      const accessReason = sub?.accessReason || "No subscription data";

      return { periodEnd, hasAccess, accessReason };
    } catch (error) {
      toast.error("Error fetching account details");
      return { periodEnd: 0, hasAccess: false, accessReason: "Error fetching subscription" };
    }
  };

  const sessionCheck = async () => {
    setIsLoading(true);
    try {
      // Priority: Use redirect parameter if provided
      if (redirectUrl) {
        const subscriptionData = await fetchProfileAndSubscription();
        if (subscriptionData.hasAccess || session?.user?.role === "admin" || session?.user?.role === "restaurant") {
          router.push(decodeURIComponent(redirectUrl));
          return;
        } else {
          // User doesn't have access but has redirect URL - store it for after payment
          console.log("No access, storing redirect URL for after payment:", subscriptionData.accessReason);
          sessionStorage.setItem('redirectUrl', redirectUrl);
        }
      }

      if (session?.user?.role === "admin") {
        router.push("/admin/dashboard");
      } else if (session?.user?.role === "restaurant") {
        const res = await axios.get("/api/auth/check-session");
        router.push("/dashboard");
      } else {
        const subscriptionData = await fetchProfileAndSubscription();
        console.log("Subscription data from SSO:", subscriptionData);

        if (!subscriptionData.hasAccess) {
          console.log("No access, redirecting to restaurants:", subscriptionData.accessReason);
          sessionStorage.removeItem('triggeredLogin');
          // Store email for checkout and redirect to restaurants
          if (session?.user?.email) {
            sessionStorage.setItem('checkoutEmail', session.user.email);
          }
          router.push("/restaurants");
        } else {
          console.log("User has access:", subscriptionData.accessReason);
          const res = await axios.get("/api/auth/check-session");
          // Use redirect URL if available, otherwise default to restaurants
          if (redirectUrl) {
            router.push(decodeURIComponent(redirectUrl));
          } else {
            router.push("/restaurants");
          }
        }
      }
    } catch (err) {
      console.error("SSO session check error:", err);
      setError("Failed to sign in with SSO. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      const triggeredLogin = sessionStorage.getItem('triggeredLogin');

      if (triggeredLogin) {
        sessionStorage.removeItem('triggeredLogin');
        sessionCheck();
      }
    }
  }, [status, session, router]);

  const redirectToStripeCheckout = async (email: any) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/payment/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const { url } = await response.json();

      if (response.ok && url) {
        window.location.replace(url);
      } else {
        throw new Error("Failed to create Stripe Checkout session");
      }
    } catch (error) {
      console.error("Stripe Checkout error:", error);
      toast.error("Failed to redirect to Stripe Checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");
    setPendingApproval(false);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.log(`Login failed: ${data.message}`);
        setError(data.message || "Login failed");
        return;
      }

      console.log(`Login successful, role: ${data.role}`);
      setMessage("Login successful! Redirecting...");
      // ✅ Update global auth context
      // setAuthState(data, data?.role === "user" && data.subscriptionStatus !== "inactive");
      const userData = {
        userId: data.userId,
        email: data.email,
        role: data.role || "user",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        restaurantId: data.restaurantId || null,
        subscriptionStatus: data.subscriptionStatus || "inactive",
      };
      
      setAuthState(userData, true);

      // If redirect URL is provided, handle it with priority (fast path)
      if (redirectUrl) {
        // For non-admin and non-restaurant users, check subscription access first
        if (data?.role !== "restaurant" && data?.role !== "admin") {
          const subscriptionData = await fetchProfileAndSubscription();
          console.log("Subscription access check:", subscriptionData);

          if (!subscriptionData.hasAccess) {
            console.log("Access denied, redirecting to restaurants:", subscriptionData.accessReason);
            sessionStorage.setItem('triggeredLogin', 'true');
            const checkoutEmail = data.email || email;
            if (checkoutEmail) {
              sessionStorage.setItem('checkoutEmail', checkoutEmail);
            }
            sessionStorage.setItem('redirectUrl', redirectUrl);
            router.push('/restaurants');
            return;
          }
        }
        // User has access or is admin/restaurant - redirect immediately (no delay)
        router.push(decodeURIComponent(redirectUrl));
        return;
      }

      // For non-admin and non-restaurant users, check subscription access
      if (data?.role !== "restaurant" && data?.role !== "admin") {
        const subscriptionData = await fetchProfileAndSubscription();
        console.log("Subscription access check:", subscriptionData);

        if (!subscriptionData.hasAccess) {
          console.log("Access denied, redirecting to restaurants:", subscriptionData.accessReason);
          sessionStorage.setItem('triggeredLogin', 'true');
          // Store email for checkout and redirect to restaurants
          const checkoutEmail = data.email || email;
          if (checkoutEmail) {
            sessionStorage.setItem('checkoutEmail', checkoutEmail);
          }
          router.push('/restaurants');
          return;
        } else {
          console.log("Access granted:", subscriptionData.accessReason);
        }
      }

      // Redirect based on fromRestaurants or role (no delay)
      // Priority 1: fromRestaurants parameter
      if (fromRestaurants && restaurantId) {
        router.push(`/restaurant/${restaurantId}`);
        return;
      }

      // Priority 2: Show onboarding for first-time users
      if (data.role === "user") {
        const isFirstLogin = checkFirstLoginOnDevice();
        if (isFirstLogin) {
          router.push("/how-it-works");
          return;
        }
      }

      // Priority 3: Fallback redirect based on role
      if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else if (data.role === "restaurant") {
        router.push("/dashboard");
      } else if (data.role === "user") {
        router.push("/restaurants");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isPending) {
    return (
      <Spinner />
    );
  }

  const logoutUserHandler: any = async () => {
    try {
      // Logout user to clear auth cookies and prevent redirect loops
      await fetch("/api/auth/logout", {
        method: "POST",
      })

      // Clear NextAuth session
      await signOut({ callbackUrl: "/", redirect: false })

      // Clear client-side auth token cookie
      document.cookie = "auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"

      // Clear sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("checkoutEmail")
      }

      // Redirect to home page
      router.push("/")
    } catch (error) {
      console.error("Error during logout:", error)
      // Still redirect even if logout fails
      router.push("/")
    }
  }
  return (
    <div className="min-h-screen relative flex flex-col">
      {/* <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/images/signin-bg.webp")' }}
      > */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{ backgroundColor: "#3e4044" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen px-6 ">
        {/* Back Button - Always visible */}
        {showLoginForm && (
          <div className="pt-4">
            <button
              // onClick={() => setShowLoginForm(false)}
              onClick={() => logoutUserHandler()}
              className="flex items-center gap-2 text-white hover:text-red-400 transition-colors font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
          </div>
        )}

        <div className="flex flex-col items-center justify-start pt-16 max-w-sm mx-auto w-full py-16">
          <div onClick={() => logoutUserHandler()} className="cursor-pointer hover:opacity-80 transition-opacity">
            <Logo size="medium" />
          </div>
        </div>

        {!showLoginForm ? (
          <div className="space-y-6 max-w-sm mx-auto w-full">
            <div className="text-center space-y-4">
              <div className="relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 border-2 border-red-400 rounded-2xl text-white text-sm font-bold backdrop-blur-sm overflow-hidden shadow-lg shadow-red-500/50">
                <div className="absolute inset-0 rounded-2xl border-2 border-red-300 animate-pulse"></div>
                <div className="absolute inset-0 rounded-2xl border-2 border-red-400 animate-ping opacity-30"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-orange-400/20 rounded-2xl animate-pulse"></div>
                <div className="relative z-10">🎉 30 days free • Cancel anytime</div>
              </div>
            </div>

            <div className="text-center mb-8 px-4 py-6 bg-black/30 rounded-2xl backdrop-blur-sm border border-white/20">
              <p className="text-3xl font-black text-white mb-4 leading-tight tracking-tight font-sans">
                Unlock Discounts, Freebies & More - 100's of Places to Enjoy
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => setShowLoginForm(true)}
                className="w-full h-14 text-lg font-semibold rounded-xl text-white bg-red-600 hover:opacity-90 transition-opacity"
              >
                Login
              </Button>

              {/* Redirect to signup page */}
              <Button
                onClick={() => {
                  const signUpUrl = restaurantId ? `/sign-up?restaurantId=${restaurantId}` : "/sign-up";
                  router.push(signUpUrl);
                }}
                className="w-full h-14 text-lg font-semibold rounded-xl bg-black text-white hover:bg-gray-900"
              >
                Sign Up
              </Button>

              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="w-full h-14 text-lg font-semibold rounded-xl bg-white/90 text-gray-900 hover:bg-white"
              >
                Browse
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-sm mx-auto w-full">
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {message && <p className="text-green-500 text-sm text-center">{message}</p>}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 text-lg rounded-xl bg-white/90 border-0 placeholder:text-gray-500"
                required
              />
              <div className="relative">
                <Input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 text-lg rounded-xl bg-white/90 border-0 placeholder:text-gray-500 pr-12"
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
              <div className="text-right text-sm">
                <button
                  type="button"
                  onClick={handleForgotPasswordOpen}
                  className="text-red-400 hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold rounded-xl text-white bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-white/80 text-sm mb-2">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    const signUpUrl = restaurantId ? `/sign-up?restaurantId=${restaurantId}` : "/sign-up";
                    router.push(signUpUrl);
                  }}
                  className="text-red-400 hover:text-red-300 font-semibold underline underline-offset-2 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={handleForgotPasswordClose}
      />
    </div>
  );
}