import { Metadata } from "next";
import ProviderProfileClient from "./ProviderProfileClient";

interface Service {
  id: string;
  name: string;
  price: number;
  currency: string;
  estimated_duration: number;
  description?: string;
}

interface ProviderProfile {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  speciality: string;
  subspecialties: string[];
  clinic_name: string;
  address: string;
  county: string;
  country: string;
  bio: string;
  languages: string[];
  insurances_accepted: string[];
  profile_picture_url: string;
  services: Service[];
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "https://veridoctor-backend-1.onrender.com";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.veridoctor.com";

async function getProvider(id: string): Promise<ProviderProfile | null> {
  try {
    const res = await fetch(`${apiUrl}/provider/${id}/public-profile`, {
      // Revalidate periodically rather than every request — profile data
      // doesn't change minute to minute.
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ...data,
      subspecialties: data.subspecialties ?? [],
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const provider = await getProvider(id);

  if (!provider) {
    return {
      title: "Doctor Not Found | VeriDoctor",
      description: "This provider profile could not be found.",
    };
  }

  const fullName = `${provider.title} ${provider.first_name} ${provider.last_name}`.trim();
  const locationPart = [provider.clinic_name, provider.county]
    .filter(Boolean)
    .join(", ");

  const description =
    (provider.bio && provider.bio.slice(0, 155)) ||
    `Book an appointment with ${fullName}, ${provider.speciality || "healthcare provider"}${
      locationPart ? ` in ${locationPart}` : ""
    } on VeriDoctor. Virtual and in-person consultations available.`;

  return {
    title: `${fullName} — ${provider.speciality || "Healthcare Provider"} | VeriDoctor`,
    description,
    alternates: {
      canonical: `${siteUrl}/book/provider/${id}`,
    },
    openGraph: {
      title: `${fullName} — ${provider.speciality || "Healthcare Provider"}`,
      description,
      url: `${siteUrl}/book/provider/${id}`,
      siteName: "VeriDoctor",
      images: provider.profile_picture_url
        ? [{ url: provider.profile_picture_url, width: 800, height: 800 }]
        : [],
      locale: "en_KE",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${fullName} — ${provider.speciality || "Healthcare Provider"}`,
      description,
    },
  };
}

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await getProvider(id);

  const jsonLd = provider
    ? {
        "@context": "https://schema.org",
        "@type": "Physician",
        name: `${provider.title} ${provider.first_name} ${provider.last_name}`.trim(),
        medicalSpecialty: provider.speciality || undefined,
        ...(provider.clinic_name || provider.county || provider.country
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: provider.county || undefined,
                addressCountry: "KE",
              },
            }
          : {}),
        ...(provider.profile_picture_url ? { image: provider.profile_picture_url } : {}),
        url: `${siteUrl}/book/provider/${id}`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProviderProfileClient initialProvider={provider} id={id} />
    </>
  );
}
