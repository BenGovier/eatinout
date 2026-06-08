"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Check } from "lucide-react";
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
  const redirectUrl = searchParams.get("redirect");
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
          console.log("Access denied, redirecting to conversion-popup:", subscriptionData.accessReason);
          sessionStorage.setItem('triggeredLogin', 'true');
          // Store email for checkout and redirect to conversion-popup
          const checkoutEmail = data.email || email;
          if (checkoutEmail) {
            sessionStorage.setItem('checkoutEmail', checkoutEmail);
          }
          router.push('/conversion-popup');
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
  // const handleLogin = async (e: any) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   setError("");
  //   setMessage("");
  //   setPendingApproval(false);

  //   try {
  //     const response = await fetch("/api/auth/login", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ email, password }),
  //     });

  //     const data = await response.json();

  //     if (!response.ok) {
  //       setError(data.message || "Login failed");
  //       return;
  //     }

  //     setMessage("Login successful! Redirecting...");

  //     const userData = {
  //       userId: data.userId,
  //       email: data.email,
  //       role: data.role || "user",
  //       firstName: data.firstName || "",
  //       lastName: data.lastName || "",
  //       restaurantId: data.restaurantId || null,
  //       subscriptionStatus: data.subscriptionStatus || "inactive",
  //     };

  //     //  Admin & Restaurant - Direct redirect, no subscription check needed
  //     if (data?.role === "admin") {
  //       setAuthState(userData, true);
  //       router.push("/admin/dashboard");
  //       return;
  //     }

  //     if (data?.role === "restaurant") {
  //       setAuthState(userData, true);
  //       router.push("/dashboard");
  //       return;
  //     }

  //     //  Regular User - subscription check, then redirect
  //     if (data?.role === "user" || !data?.role) {

  //       // Loading state  subscription check 
  //       let subscriptionData;
  //       try {
  //         subscriptionData = await fetchProfileAndSubscription();
  //         console.log("Subscription check result:", subscriptionData);
  //       } catch (err) {
  //         console.error("Subscription check failed:", err);

  //         subscriptionData = { hasAccess: false, periodEnd: 0, accessReason: "Check failed" };
  //       }

  //       // Store email for checkout
  //       const checkoutEmail = data.email || email;
  //       if (checkoutEmail) {
  //         sessionStorage.setItem('checkoutEmail', checkoutEmail);
  //       }

  //       if (!subscriptionData.hasAccess) {
  //         console.log("No access → conversion-popup:", subscriptionData.accessReason);

  //         // Auth state set  but hasAccess false
  //         setAuthState(userData, false);

  //         if (redirectUrl) {
  //           sessionStorage.setItem('redirectUrl', redirectUrl);
  //         }

  //         router.push('/conversion-popup');
  //         return;
  //       }

  //       // User has access
  //       console.log("Access granted:", subscriptionData.accessReason);
  //       setAuthState(userData, true);

  //       // Redirect URL priority
  //       if (redirectUrl) {
  //         router.push(decodeURIComponent(redirectUrl));
  //         return;
  //       }

  //       if (fromRestaurants && restaurantId) {
  //         router.push(`/restaurant/${restaurantId}`);
  //         return;
  //       }

  //       const isFirstLogin = checkFirstLoginOnDevice();
  //       if (isFirstLogin) {
  //         router.push("/how-it-works");
  //         return;
  //       }

  //       router.push("/restaurants");
  //     }

  //   } catch (err: any) {
  //     console.error("Login error:", err);
  //     setError("Network error. Please try again.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  if (isPending) {
    return (
      <Spinner />
    );
  }

  // Build the sign-up CTA href, preserving redirect and restaurantId query intent
  const goToSignUp = () => {
    const params = new URLSearchParams();
    if (redirectUrl) params.set("redirect", redirectUrl);
    if (restaurantId) params.set("restaurantId", restaurantId);
    const query = params.toString();
    router.push(query ? `/sign-up?${query}` : "/sign-up");
  };

  const benefits = [
    "30 days free, then £4.99/month",
    "Show your voucher when you visit",
    "Cancel anytime",
  ];

  const trustPills = ["30 days free", "£4.99/month", "Cancel anytime"];

  const foodImage =
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/22.png-FjHsCSsScJT76IHTeq7DFobAck45ur.jpeg";

  return (
    <div className="min-h-screen bg-[#fdf6ec] flex flex-col lg:flex-row">
      {/* Left: warm restaurant brand panel (desktop only) */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden">
        <Image
          src={foodImage}
          alt="Friends enjoying dishes and drinks at a restaurant"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        {/* Warm gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-12">
          <Image
            src="/eatinout-logo.webp"
            alt="Eatinout"
            width={150}
            height={38}
            className="h-9 w-auto brightness-0 invert"
          />
          <div className="space-y-5 max-w-md">
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white text-balance leading-tight">
              Restaurant discounts when you eat out
            </h2>
            <p className="text-lg text-white/85 text-pretty">
              Save up to 50% at 500+ restaurants, cafés and bars.
            </p>
            <div className="flex flex-wrap gap-2">
              {trustPills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full bg-white/15 backdrop-blur-sm px-3.5 py-1.5 text-sm font-medium text-white border border-white/25"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: login + new user */}
      <div className="flex-1 lg:w-1/2 flex flex-col justify-center px-5 py-8 md:px-8 lg:px-12">
        <div className="w-full max-w-md mx-auto space-y-5">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden">
            <Image
              src="/eatinout-logo.webp"
              alt="Eatinout"
              width={140}
              height={36}
              className="h-8 w-auto"
            />
          </div>

          {/* Mobile warm image / benefit strip */}
          <div className="relative h-28 rounded-3xl overflow-hidden shadow-sm lg:hidden">
            <Image
              src={foodImage}
              alt="Friends enjoying dishes at a restaurant"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
            <div className="relative z-10 h-full flex flex-col justify-center px-5">
              <p className="text-white font-bold text-base leading-snug text-balance">
                Restaurant discounts when you eat out
              </p>
              <p className="text-white/85 text-xs mt-1">Save up to 50% at 500+ places</p>
            </div>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl border border-[#ecdfcb] shadow-md shadow-black/5 p-6 md:p-7 space-y-5">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Sign in to your membership
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back — view your offers and saved restaurants.
              </p>
            </div>

            {error && <p className="text-primary text-sm">{error}</p>}
            {message && <p className="text-foreground text-sm font-medium">{message}</p>}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 text-base rounded-xl bg-[#faf7f1] border border-[#ecdfcb] focus-visible:ring-primary/30 placeholder:text-muted-foreground"
                required
              />
              <div className="relative">
                <Input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 text-base rounded-xl bg-[#faf7f1] border border-[#ecdfcb] focus-visible:ring-primary/30 placeholder:text-muted-foreground pr-12"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                >
                  {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="text-right text-sm">
                <button
                  type="button"
                  onClick={handleForgotPasswordOpen}
                  className="text-primary hover:underline font-medium"
                >
                  Forgot your password?
                </button>
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold rounded-xl bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/90 transition-colors"
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
                  "Sign in"
                )}
              </Button>
            </form>
          </div>

          {/* New user card */}
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.05] shadow-sm p-6 md:p-7 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">New to Eatinout?</h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Start 30 days free and save up to 50% when you eat out.
              </p>
            </div>
            <Button
              onClick={goToSignUp}
              className="w-full h-14 text-lg font-semibold rounded-xl text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#C8102E" }}
            >
              Start my 30-day free trial
            </Button>
          </div>

          {/* Compact benefits block */}
          <div className="rounded-2xl border border-[#ecdfcb] bg-[#fffaf2] p-4 space-y-2.5">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                </span>
                <span className="text-sm text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={handleForgotPasswordClose}
      />
    </div>
  );
}
