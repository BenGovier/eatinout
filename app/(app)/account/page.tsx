"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronRight,
  CreditCard,
  User,
  Phone
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: "user" | "restaurant" | "admin";
  subscriptionStatus: "active" | "inactive" | "cancelled" | "cancelled_with_access";
}

interface Subscription {
  status: "active" | "canceled" | "inactive";
  currentPeriodEnd?: number;
}

export default function AccountPage() {
  const [user, setUser] = useState<User>({
    firstName: "",
    lastName: "",
    email: "",
    role: "user",
    subscriptionStatus: "inactive",
  });

  const [subscription, setSubscription] = useState<Subscription>({
    status: "inactive",
  });

  useEffect(() => {
    document.title = "Account";
  }, []);

  useEffect(() => {
    const fetchProfileAndSubscription = async () => {
      try {
        const profileRes = await axios.get("/api/profile");
        setUser(profileRes.data);

        const subRes = await axios.get("/api/subscriptions");
        const sub = subRes?.data?.subscriptionDetails;

        if (sub?.status) {
          setSubscription({
            status: sub.status,
            currentPeriodEnd: sub?.current_period_end,
          });
        } else {
          setSubscription({ status: "inactive" });
        }
      } catch (error) {
        toast.error("Error fetching account details");
      }
    };

    fetchProfileAndSubscription();
  }, []);

  const renderSubscriptionStatus = () => {
    if (user.subscriptionStatus === "active") {
      return <span>Active Subscription</span>;
    }

    if ((user.subscriptionStatus === "cancelled" || user.subscriptionStatus === "cancelled_with_access") && subscription.currentPeriodEnd) {
      const formattedDate = new Date(
        subscription.currentPeriodEnd * 1000
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return <span>Valid until {formattedDate}</span>;
    }

    return <span>Inactive Subscription</span>;
  };

  const getStatusColor = () => {
    switch (subscription.status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "canceled":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-red-100 text-red-700";
    }
  };

  return (
    <div className="container px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader >
            <CardTitle>
              {user.firstName} {user.lastName}
            </CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent >
            <div className="flex items-center justify-between ">
              <div className="flex items-center">
                <div
                  className={`h-6 w-6 mr-2 rounded-full flex items-center justify-center text-xs ${getStatusColor()}`}
                >
                  {user.subscriptionStatus === "active" ? "✓" : "!"}
                </div>
                {renderSubscriptionStatus()}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Link href="/account/profile">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Profile Settings</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/account/contact">
            <Card className="mt-2">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Contact</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/payment">
            <Card className="mt-2">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Manage Subscription</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent>
              <SignOutButton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
