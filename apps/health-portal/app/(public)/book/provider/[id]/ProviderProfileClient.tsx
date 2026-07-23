"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LucideArrowLeft,
  LucideMapPin,
  LucideLanguages,
  LucideShieldCheck,
  LucideStethoscope,
  LucideStar,
  LucideMessageSquare,
  LucideBuilding2,
} from "@veridoctor/design/icons";

interface Service {
  id: string;
  name: string;
  price: number | null;
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

function capitalizeFirst(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    month: "short",
    year: "numeric",
  });
}

// Picks which location to show in the compact header line. Falls back to
// the first location for a provider who somehow has none flagged primary
// (shouldn't happen — the backend auto-primaries the first location a
// provider adds — but this keeps the header from just being blank).
function getPrimaryLocation(locations: ProviderLocation[]): ProviderLocation | null {
  if (locations.length === 0) return null;
  return locations.find((l) => l.is_primary) ?? locations[0];
}

/** Renders 5 stars, filled up to `rating` (rounded to nearest whole star
 * for display purposes — the underlying average can still be fractional,
 * e.g. 4.3, which is shown as text alongside the stars). */
function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <LucideStar
          key={i}
          size={size}
          className={
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          }
        />
      ))}
    </div>
  );
}

export default function ProviderProfileClient({
  initialProvider,
  reviewsData,
  id,
}: {
  initialProvider: ProviderProfile | null;
  reviewsData: ReviewsData;
  id: string;
}) {
  const router = useRouter();
  const [provider] = useState<ProviderProfile | null>(initialProvider);

  if (!provider) {
    return (
      <div className="p-6 text-center text-gray-400">
        Provider not found.
        <div className="mt-3">
          <button
            onClick={() => router.push("/book")}
            className="text-blue-600 text-sm hover:underline"
          >
            ← Back to Find a Doctor
          </button>
        </div>
      </div>
    );
  }

  const initials =
    (provider.first_name[0] ?? "") + (provider.last_name[0] ?? "");

  const hasReviews = reviewsData.review_count > 0 && reviewsData.average_rating !== null;
  const primaryLocation = getPrimaryLocation(provider.locations);
  const hasMultipleLocations = provider.locations.length > 1;

  return (
    <div className="space-y-4 max-w-3xl mx-auto p-4">
      <button
        onClick={() => router.push("/book")}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <LucideArrowLeft size={14} /> Back to Find a Doctor
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Photo — full-width square, bleeds to the card edges rather than
            sitting inside a small circle. object-cover crops sensibly if
            the source image isn't a perfect square. */}
        <div className="w-full aspect-square bg-blue-50 relative">
          {provider.profile_picture_url ? (
            <Image
              src={provider.profile_picture_url}
              alt={`${provider.first_name} ${provider.last_name}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold shadow-md">
                {initials.toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800">
              {provider.title} {provider.first_name} {provider.last_name}
            </h1>
            <p className="text-sm text-blue-600 font-medium mt-0.5">
              {provider.speciality || "General Practitioner"}
            </p>

            {/* Star rating summary — only shown once at least one review
                exists, right under the speciality line where a patient
                scanning the page will look for it first. */}
            {hasReviews && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <StarRow rating={reviewsData.average_rating!} size={15} />
                <span className="text-sm font-semibold text-gray-700">
                  {reviewsData.average_rating!.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({reviewsData.review_count} review{reviewsData.review_count !== 1 ? "s" : ""})
                </span>
              </div>
            )}

            {provider.subspecialties.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {provider.subspecialties.map((sub) => (
                  <span
                    key={sub}
                    className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            )}
            {primaryLocation && (
              <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1.5">
                <LucideMapPin size={14} className="text-gray-400" />
                {[primaryLocation.name, primaryLocation.county, primaryLocation.country]
                  .filter(Boolean)
                  .join(", ")}
                {hasMultipleLocations && (
                  <span className="text-xs text-blue-600 font-medium">
                    +{provider.locations.length - 1} more
                  </span>
                )}
              </p>
            )}
          </div>

          <button
            onClick={() => router.push(`/book?provider=${provider.id}`)}
            className="w-full mt-5 bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View available slots →
          </button>
        </div>
      </div>

      {provider.bio && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <LucideStethoscope size={16} className="text-blue-500" />
            About
          </h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {capitalizeFirst(provider.bio)}
          </p>
        </div>
      )}

      {/* Full location list — only broken out as its own card once there's
          more than one, so a single-location provider's page still reads
          exactly like it did before (header line is enough). Facility
          *selection* for booking happens on the booking page itself; this
          is purely informational, so patients can see where a provider
          practices before deciding to book. */}
      {hasMultipleLocations && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <LucideBuilding2 size={16} className="text-blue-500" />
            Practice Locations
          </h2>
          <div className="space-y-2">
            {provider.locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <LucideMapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {loc.name}
                    {loc.is_primary && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                        Main
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[loc.address, loc.county, loc.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {provider.services.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3">Services</h2>
          <div className="space-y-2">
            {provider.services.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {s.price != null && (
                    <p className="text-sm font-semibold text-gray-700">
                      {s.currency} {Number(s.price).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{s.estimated_duration} min</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {provider.languages.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <LucideLanguages size={16} className="text-blue-500" />
            Languages Spoken
          </h2>
          <div className="flex gap-2 flex-wrap">
            {provider.languages.map((lang) => (
              <span
                key={lang}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {provider.insurances_accepted.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <LucideShieldCheck size={16} className="text-green-500" />
            Insurances Accepted
          </h2>
          <div className="flex gap-2 flex-wrap">
            {provider.insurances_accepted.map((ins) => (
              <span
                key={ins}
                className="text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-medium"
              >
                {ins}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews — only rendered once at least one exists. Only
          patient_first_name is ever shown, per the API's public serializer,
          which deliberately excludes last name and identity. */}
      {reviewsData.reviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <LucideMessageSquare size={16} className="text-blue-500" />
            Patient Reviews
          </h2>
          <div className="space-y-4">
            {reviewsData.reviews.map((r) => (
              <div
                key={r.id}
                className="border-b border-gray-100 last:border-0 pb-4 last:pb-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {r.patient_first_name}
                  </p>
                  <span className="text-xs text-gray-400">
                    {formatReviewDate(r.created_at)}
                  </span>
                </div>
                <StarRow rating={r.rating} size={13} />
                {r.comment && (
                  <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap">
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
