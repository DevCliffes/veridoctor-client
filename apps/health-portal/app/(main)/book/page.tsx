"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideSearch,
  LucideVideo,
  LucideMapPin,
  LucideLoader2,
  LucideCalendarCheck,
  LucideX,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronDown,
  LucideChevronUp,
} from "@veridoctor/design/icons";

interface Service {
  id: string;
  name: string;
  price: number;
  currency: string;
  estimated_duration: number;
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  speciality: string;
  clinic_name: string;
  county: string;
  bio: string;
  languages: string[];
  insurances_accepted: string[];
  services: Service[];
}

interface Slot {
  start_time: string;
  end_time: string;
  service_id: string | null;
  service_name: string | null;
  location_type: "virtual" | "physical" | "both";
  duration_minutes: number;
}

interface BookingState {
  provider: Provider;
  slot: Slot;
  date: string;
  appointmentType: "virtual" | "physical";
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={
        "fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium " +
        (type === "success" ? "bg-green-600" : "bg-red-600")
      }
    >
      {message}
    </div>
  );
}

function dateLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNext7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function ProviderCard({
  provider,
  onBook,
}: {
  provider: Provider;
  onBook: (state: BookingState) => void;
}) {
  const router = useRouter();
  const days = getNext7Days();
  const [daySlots, setDaySlots] = useState<Record<string, Slot[]>>({});
  const [loadingDays, setLoadingDays] = useState<Record<string, boolean>>({});
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    provider.services[0]?.id ?? null
  );
  const [selectedApptType, setSelectedApptType] = useState<"virtual" | "physical">("virtual");
  const [expanded, setExpanded] = useState(false);
  const visibleDays = days.slice(dayOffset, dayOffset + 3);

  useEffect(() => {
    visibleDays.forEach((day) => {
      if (daySlots[day] !== undefined) return;
      setLoadingDays((prev) => ({ ...prev, [day]: true }));
      axiosClient
        .get("/provider/" + provider.id + "/available-slots?date=" + day)
        .then((res) =>
          setDaySlots((prev) => ({ ...prev, [day]: res.data ?? [] }))
        )
        .catch(() => setDaySlots((prev) => ({ ...prev, [day]: [] })))
        .finally(() =>
          setLoadingDays((prev) => ({ ...prev, [day]: false }))
        );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOffset, provider.id]);

  const initials =
    (provider.first_name[0] ?? "") + (provider.last_name[0] ?? "");

  const hasExtraInfo =
    provider.bio ||
    provider.clinic_name ||
    provider.county ||
    (provider.languages && provider.languages.length > 0) ||
    (provider.insurances_accepted && provider.insurances_accepted.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
          {initials.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            onClick={() => router.push("/book/provider/" + provider.id)}
            className="font-bold text-gray-800 text-base hover:text-blue-600 cursor-pointer transition-colors"
          >
            Dr. {provider.first_name} {provider.last_name}
          </h3>
          <p className="text-sm text-blue-600 font-medium mt-0.5">
            {provider.speciality ?? "General Practitioner"}
          </p>
          {provider.clinic_name && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <LucideMapPin size={11} className="shrink-0" />
              {provider.clinic_name}
              {provider.county ? ", " + provider.county : ""}
            </p>
          )}
          {provider.services.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {provider.services.map((s) => s.name).join(" · ")}
            </p>
          )}
          {provider.services[0] && (
            <p className="text-xs text-gray-400 mt-0.5">
              From {provider.services[0].currency}{" "}
              {Number(provider.services[0].price).toLocaleString()} ·{" "}
              {provider.services[0].estimated_duration} min
            </p>
          )}
        </div>
      </div>

      {/* Expandable extra info */}
      {hasExtraInfo && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {expanded ? (
              <>
                <LucideChevronUp size={13} /> Less info
              </>
            ) : (
              <>
                <LucideChevronDown size={13} /> More info
              </>
            )}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              {provider.bio && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    About
                  </p>
                  <p className="text-sm text-gray-600">{provider.bio}</p>
                </div>
              )}

              {provider.languages && provider.languages.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                    Languages
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {provider.languages.map((lang) => (
                      <span
                        key={lang}
                        className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {provider.insurances_accepted && provider.insurances_accepted.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                    Accepted Insurance
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {provider.insurances_accepted.map((ins) => (
                      <span
                        key={ins}
                        className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100"
                      >
                        {ins}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Service selector */}
      {provider.services.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
            Service
          </p>
          <div className="flex gap-2 flex-wrap">
            {provider.services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedServiceId(s.id)}
                className={
                  "text-xs px-3 py-1.5 rounded-full border transition-colors " +
                  (selectedServiceId === s.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 text-gray-600 hover:border-gray-300")
                }
              >
                {s.name} · {s.estimated_duration}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Appointment type */}
      <div className="mt-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
          Appointment type
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedApptType("virtual")}
            className={
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border transition-colors " +
              (selectedApptType === "virtual"
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                : "border-gray-200 text-gray-600")
            }
          >
            <LucideVideo size={13} /> Virtual
          </button>
          <button
            onClick={() => setSelectedApptType("physical")}
            className={
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border transition-colors " +
              (selectedApptType === "physical"
                ? "bg-green-50 border-green-300 text-green-700 font-medium"
                : "border-gray-200 text-gray-600")
            }
          >
            <LucideMapPin size={13} /> In-person
          </button>
        </div>
      </div>

      {/* Date slots */}
      <div className="mt-4 flex gap-2 items-start">
        <button
          onClick={() => setDayOffset(Math.max(0, dayOffset - 3))}
          disabled={dayOffset === 0}
          className="p-1 mt-1 rounded hover:bg-gray-100 disabled:opacity-30"
        >
          <LucideChevronLeft size={16} />
        </button>

        <div className="flex gap-2 flex-1">
          {visibleDays.map((day) => {
            const allSlots = daySlots[day] ?? [];
            const now = new Date();
            const futureSlots = allSlots.filter((slot) => {
              if (new Date(slot.start_time) <= now) return false;
              if (
                selectedServiceId &&
                slot.service_id &&
                slot.service_id !== selectedServiceId
              )
                return false;
              if (
                slot.location_type !== "both" &&
                slot.location_type !== selectedApptType
              )
                return false;
              return true;
            });
            const loading = loadingDays[day];
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                <p className="text-xs font-semibold text-gray-500 text-center">
                  {dateLabel(day)}
                </p>
                {loading ? (
                  <LucideLoader2
                    size={16}
                    className="animate-spin text-gray-300 my-2"
                  />
                ) : futureSlots.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-2">
                    No slots
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 w-full">
                    {futureSlots.slice(0, 3).map((slot) => (
                      <button
                        key={slot.start_time}
                        onClick={() =>
                          onBook({
                            provider,
                            slot,
                            date: day,
                            appointmentType: selectedApptType,
                          })
                        }
                        className="w-full text-xs py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 border border-blue-100 transition-colors"
                      >
                        {formatTime(slot.start_time)}
                      </button>
                    ))}
                    {futureSlots.length > 3 && (
                      <p className="text-xs text-gray-400 text-center">
                        +{futureSlots.length - 3} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() =>
            setDayOffset(Math.min(days.length - 3, dayOffset + 3))
          }
          disabled={dayOffset + 3 >= days.length}
          className="p-1 mt-1 rounded hover:bg-gray-100 disabled:opacity-30"
        >
          <LucideChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function BookingModal({
  booking,
  patientEmail,
  patientFirst,
  patientLast,
  patientPhone,
  onClose,
  onConfirmed,
}: {
  booking: BookingState;
  patientEmail: string;
  patientFirst: string;
  patientLast: string;
  patientPhone: string;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!patientEmail) {
      setError("We couldn't verify your account email. Please refresh and try again.");
      return;
    }
    if (!patientFirst || !patientLast) {
      setError("Your profile is missing a name. Please update your profile first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axiosClient.post(
        "/provider/" + booking.provider.id + "/appointments",
        {
          patient_first_name: patientFirst,
          patient_last_name: patientLast,
          patient_email: patientEmail,
          patient_phone_number: patientPhone,
          start_time: booking.slot.start_time,
          end_time: booking.slot.end_time,
          appointment_type: booking.appointmentType,
          service: booking.slot.service_id,
          message,
          status: "scheduled",
        }
      );
      onConfirmed();
    } catch (err: any) {
      const backendError = err?.response?.data?.error;
      setError(backendError || "Booking failed. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <LucideCalendarCheck size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Confirm booking</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <LucideX size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="font-semibold text-gray-800">
              Dr. {booking.provider.first_name} {booking.provider.last_name}
            </p>
            <p className="text-sm text-blue-600 mt-0.5">
              {booking.provider.speciality}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {dateLabel(booking.date)} · {formatTime(booking.slot.start_time)}{" "}
              – {formatTime(booking.slot.end_time)}
            </p>
            {booking.slot.service_name && (
              <p className="text-xs text-gray-400 mt-1">
                {booking.slot.service_name}
              </p>
            )}
          </div>

          {(patientFirst || patientEmail) && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Booking as:{" "}
              <span className="font-medium text-gray-700">
                {[patientFirst, patientLast].filter(Boolean).join(" ") || patientEmail}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 w-fit">
            {booking.appointmentType === "virtual" ? (
              <LucideVideo size={13} className="text-indigo-500" />
            ) : (
              <LucideMapPin size={13} className="text-green-500" />
            )}
            <span className="font-medium text-gray-700 capitalize">
              {booking.appointmentType === "virtual" ? "Virtual" : "In-person"}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Message (optional)
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your symptoms or reason for visit..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Booking..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  const { identity } = useAppSelector((store) => store.auth);
  const identityId = typeof identity === "string" ? identity : "";

  const [patientEmail, setPatientEmail] = useState("");
  const [patientFirst, setPatientFirst] = useState("");
  const [patientLast, setPatientLast] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!identityId) return;
    axiosClient
      .get("/identity/register/" + identityId)
      .then((res) => {
        setPatientEmail(res.data.email ?? "");
        setPatientFirst(res.data.first_name ?? "");
        setPatientLast(res.data.last_name ?? "");
        setPatientPhone(res.data.phone_number ?? "");
        setProfileError(false);
      })
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false));
  }, [identityId]);

  useEffect(() => {
    axiosClient
      .get("/provider/list")
      .then((res) => setProviders(res.data ?? []))
      .catch(() =>
        setToast({ message: "Failed to load providers", type: "error" })
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = providers.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      (p.speciality ?? "").toLowerCase().includes(q) ||
      (p.clinic_name ?? "").toLowerCase().includes(q) ||
      p.services.some((s) => s.name.toLowerCase().includes(q)) ||
      (p.insurances_accepted ?? []).some((ins) =>
        ins.toLowerCase().includes(q)
      )
    );
  });

  const specialities = [
    ...new Set(providers.map((p) => p.speciality).filter(Boolean)),
  ];

  const handleBookClick = (state: BookingState) => {
    if (profileLoading) {
      setToast({
        message: "Still loading your profile, please wait a moment...",
        type: "error",
      });
      return;
    }
    if (profileError || !patientEmail) {
      setToast({
        message: "We couldn't load your account details. Please refresh and try again.",
        type: "error",
      });
      return;
    }
    setBooking(state);
  };

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Find a Doctor</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Search and book appointments with our providers
        </p>

        <div className="mt-4 relative">
          <LucideSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, speciality, clinic or insurance..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
          />
        </div>

        {specialities.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              onClick={() => setSearch("")}
              className={
                "text-xs px-3 py-1 rounded-full border transition-colors " +
                (search === ""
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300")
              }
            >
              All
            </button>
            {specialities.map((s) => (
              <button
                key={s}
                onClick={() => setSearch(s ?? "")}
                className={
                  "text-xs px-3 py-1 rounded-full border transition-colors " +
                  (search === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 text-gray-500 hover:border-gray-300")
                }
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LucideLoader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No providers found matching your search.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProviderCard key={p.id} provider={p} onBook={handleBookClick} />
          ))}
        </div>
      )}

      {booking && (
        <BookingModal
          booking={booking}
          patientEmail={patientEmail}
          patientFirst={patientFirst}
          patientLast={patientLast}
          patientPhone={patientPhone}
          onClose={() => setBooking(null)}
          onConfirmed={() => {
            setBooking(null);
            setToast({
              message: "Appointment booked successfully!",
              type: "success",
            });
          }}
        />
      )}
    </div>
  );
}
