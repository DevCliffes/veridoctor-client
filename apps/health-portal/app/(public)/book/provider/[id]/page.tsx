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

interface ProviderLocation {
  id: string;
  name: string;
  address: string;
  county: string;
  country: string;
  is_primary: boolean;
}

interface ProviderProfile {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  speciality: string;
  subspecialties: string[];
  locations: ProviderLocation[];
  bio: string;
  languages: string[];
  insurances_accepted: string[];
  profile_picture_url: string;
  services: Service[];
}

interface Review {
  id: string;
  patient_first_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ReviewsData {
  average_rating: number | null;
  review_count: number;
  reviews: Review[];
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "https://veridoctor-backend-1.onrender.com";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.veridoctor.com";

// A provider can now have several approved locations. Metadata/JSON-LD
// only ever describe one "primary" place of practice — this picks the
// one flagged is_primary, falling back to the first approved location
// for a provider who hasn't designated one (shouldn't normally happen,
// since the first location added is auto-primary on the backend, but
// this keeps generateMetadata/JSON-LD from breaking if that invariant
// is ever violated).
function getPrimaryLocation(
  locations: ProviderLocation[] | undefined
): ProviderLocation | null {
  if (!locations || locations.length === 0) return null;
  return locations.find((l) => l.is_primary) ?? locations[0];
}

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
      locations: data.locations ?? [],
    };
  } catch {
    return null;
  }
}

async function getReviews(id: string): Promise<ReviewsData> {
  try {
    const res = await fetch(`${apiUrl}/provider/${id}/reviews`, {
      // Reviews change more often than profile data, so a shorter
      // revalidate window keeps the average rating reasonably fresh.
      next: { revalidate: 300 },
    });
    if (!res.ok) return { average_rating: null, review_count: 0, reviews: [] };
    return await res.json();
  } catch {
    return { average_rating: null, review_count: 0, reviews: [] };
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
  const primaryLocation = getPrimaryLocation(provider.locations);
  const locationPart = primaryLocation
    ? [primaryLocation.name, primaryLocation.county].filter(Boolean).join(", ")
    : "";
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
  const [provider, reviewsData] = await Promise.all([
    getProvider(id),
    getReviews(id),
  ]);

  const primaryLocation = provider ? getPrimaryLocation(provider.locations) : null;

  const jsonLd = provider
    ? {
        "@context": "https://schema.org",
        "@type": "Physician",
        name: `${provider.title} ${provider.first_name} ${provider.last_name}`.trim(),
        medicalSpecialty: provider.speciality || undefined,
        ...(primaryLocation
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: primaryLocation.county || undefined,
                addressCountry: "KE",
              },
            }
          : {}),
        ...(provider.profile_picture_url ? { image: provider.profile_picture_url } : {}),
        ...(reviewsData.review_count > 0 && reviewsData.average_rating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: reviewsData.average_rating,
                reviewCount: reviewsData.review_count,
              },
            }
          : {}),
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
      <ProviderProfileClient
        initialProvider={provider}
        reviewsData={reviewsData}
        id={id}
      />
    </>
  );
}
