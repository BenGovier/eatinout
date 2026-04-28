import LocationConsentProvider from "@/components/location-consent-provider";

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LocationConsentProvider>{children}</LocationConsentProvider>;
}
