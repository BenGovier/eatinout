"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import {
  USER_LAT_LNG_SESSION_KEY,
  notifyUserLocationStorageChanged,
} from "@/lib/user-location-session";

interface WelcomeLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LatLng = { lat: number; lng: number };

export function WelcomeLocationModal({
  isOpen,
  onClose,
}: WelcomeLocationModalProps) {
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const storeLatLng = useCallback((coords: LatLng) => {
    // Store in session storage so users can change location later in-session.
    sessionStorage.setItem(USER_LAT_LNG_SESSION_KEY, JSON.stringify(coords));
    notifyUserLocationStorageChanged();
  }, []);

  const handleUseMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      onClose();
      return;
    }

    setIsRequestingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        storeLatLng(coords);
        setIsRequestingLocation(false);
        onClose();
      },
      () => {
        // If the user denies or the request fails, just hide the modal.
        setIsRequestingLocation(false);
        onClose();
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  }, [onClose, storeLatLng]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-[320px] sm:w-[340px] rounded-2xl bg-white p-5 sm:p-6 shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-location-title"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
          disabled={isRequestingLocation}
        >
          <X className="h-4 w-4" />
        </button>

        <h2
          id="welcome-location-title"
          className="text-base sm:text-[17px] font-bold text-gray-900 pr-6"
        >
          See restaurant deals near you
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-gray-500">
          Share your location to discover nearby restaurants, bars and offers.
          You can change this anytime.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isRequestingLocation}
            className="w-full rounded-xl bg-[#eb221c] hover:bg-[#eb221c]/90 disabled:opacity-70 disabled:cursor-not-allowed px-4 py-3 text-white font-bold transition-colors"
          >
            {isRequestingLocation ? "Getting location..." : "Use my location"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isRequestingLocation}
            className="w-full rounded-xl border border-gray-200 hover:border-gray-300 bg-white px-4 py-3 text-gray-800 font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
