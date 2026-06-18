"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideArrowLeft,
  LucideMapPin,
  LucideLoader2,
  LucideLanguages,
  LucideShieldCheck,
  LucideStethoscope,
} from "@veridoctor/design/icons";

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

export default function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    axiosClient
      .get(`/provider/${id}/public-profile`)
      .then((res) => setProvider(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LucideLoader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

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

  return (
    <div className="space-y-4 max-w-3xl mx-auto p-4">
      <button
        onClick={() => router.push("/book")}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <LucideArrowLeft size={14} /> Back to Find a Doctor
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex gap-4 items-start">
          {provider.profile_picture_url ? (
            <img
              src={provider.profile_picture_url}
              alt={`${provider.first_name} ${provider.last_name}`}
              className="w-20 h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold shrink-0">
              {initials.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">
              {provider.title} {provider.first_name} {provider.last_name}
            </h1>
            <p className="text-sm text-blue-600 font-medium mt-0.5">
              {provider.speciality || "General Practitioner"}
            </p>
            {(provider.clinic_name || provider.county) && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
                <LucideMapPin size={14} className="text-gray-400" />
                {[provider.clinic_name, provider.county, provider.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push(`/book?provider=${provider.id}`)}
          className="mt-5 w-full sm:w-auto bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          View available slots →
        </button>
      </div>

      {provider.bio && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <LucideStethoscope size={16} className="text-blue-500" />
            About
          </h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {provider.bio}
          </p>
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
                  <p className="text-sm font-semibold text-gray-700">
                    {s.currency} {Number(s.price).toLocaleString()}
                  </p>
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
    </div>
  );
}
