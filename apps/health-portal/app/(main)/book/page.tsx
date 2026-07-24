"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  LucideChevronRightCircle,
  LucideLanguages,
  LucideShieldCheck,
  LucideChevronUp,
  LucideChevronDown,
  LucideStar,
} from "@veridoctor/design/icons";

interface Service {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  estimated_duration: number;
}

// NEW: mirrors the shape ProviderLocationPublicSerializer already returns
// elsewhere (ProviderProfileClient.tsx uses the same fields).
interface ProviderLocation {
  id: string;
  name: string;
  address: string;
  county: string;
  country: string;
  is_primary: boolean;
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  title?: string;
  speciality: string;
  subspecialties?: string[];
  // NOTE: clinic_name/county were removed from HealthcareProvider itself
  // in migration 0015 -- these are kept optional here since /provider/list
  // may no longer populate them at all. See getLocationLabel() below,
  // which falls back to the provider's primary location when these are
  // absent so the identity strip doesn't just go blank.
  clinic_name?: string;
  county?: string;
  bio: string;
  languages: string[];
  insurances_accepted: string[];
  profile_picture_url?: string;
  services: Service[];
  average_rating?: number | null;
  review_count?: number;
  // NEW: full approved-location list, same as ProviderProfileClient's
  // ProviderProfile.locations. Empty/undefined means this provider has no
  // physical facilities -- the "In-person" toggle is hidden entirely in
  // that case, since there'd be nowhere for the patient to go.
  locations?: ProviderLocation[];
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
  // NEW: which facility this booking is at, when physical. Threaded through
  // to the POST payload so ProviderAppointmentSerializer.validate() (which
  // now requires a location for physical appointments) has something to
  // validate against.
  locationId?: string | null;
  locationName?: string | null;
  _invalidate?: () => void;
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

// NEW: picks which location to default the picker to / to show in the
// identity strip fallback -- same "primary, else first" rule used by
// ProviderProfileClient.tsx and the provider-profile page's metadata.
function getPrimaryLocation(locations?: ProviderLocation[]): ProviderLocation | null {
  if (!locations || locations.length === 0) return null;
  return locations.find((l) => l.is_primary) ?? locations[0];
}

// NEW: identity-strip location text. Prefers the old flat clinic_name/county
// fields if /provider/list still happens to send them; otherwise falls back
// to the provider's primary location, since those flat fields no longer
// exist on the backend model as of migration 0015.
function getLocationLabel(provider: Provider): string | null {
  if (provider.clinic_name || provider.county) {
    return [provider.clinic_name, provider.county].filter(Boolean).join(", ");
  }
  const primary = getPrimaryLocation(provider.locations);
  if (!primary) return null;
  return [primary.name, primary.county].filter(Boolean).join(", ");
}

/** Renders 5 stars, filled up to the nearest whole star for `rating`. */
function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
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

// ─────────────────────────────────────────────
// Round avatar used in the card's horizontal identity strip.
// Falls back to initials on a coloured background.
// ─────────────────────────────────────────────
function ProviderAvatarLarge({ provider }: { provider: Provider }) {
  const initials =
    (provider.first_name[0] ?? "") + (provider.last_name[0] ?? "");
  const title = provider.title || "Dr.";

  if (provider.profile_picture_url) {
    return (
      <Image
        src={provider.profile_picture_url}
        alt={`${title} ${provider.first_name} ${provider.last_name}`}
        width={64}
        height={64}
        className="w-16 h-16 object-cover object-top"
      />
    );
  }

  return (
    <div className="w-16 h-16 flex items-center justify-center bg-blue-600 text-white font-bold text-lg">
      {initials.toUpperCase()}
    </div>
  );
}

// Small avatar for the booking modal
function ProviderAvatar({ provider }: { provider: Provider }) {
  const initials =
    (provider.first_name[0] ?? "") + (provider.last_name[0] ?? "");
  const title = provider.title || "Dr.";
  if (provider.profile_picture_url) {
    return (
      <Image
        src={provider.profile_picture_url}
        alt={`${title} ${provider.first_name} ${provider.last_name}`}
        width={48}
        height={48}
        className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100"
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-base">
      {initials.toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────
// Slot column with up/down arrows, max 5 visible
// ─────────────────────────────────────────────
const SLOTS_PER_PAGE = 5;

function SlotColumn({
  day,
  slots,
  loading,
  onBook,
}: {
  day: string;
  slots: Slot[];
  loading: boolean;
  onBook: (slot: Slot) => void;
}) {
  const [offset, setOffset] = useState(0);

  useEffect(() => setOffset(0), [slots]);

  const visible = slots.slice(offset, offset + SLOTS_PER_PAGE);
  const canUp = offset > 0;
  const canDown = offset + SLOTS_PER_PAGE < slots.length;

  return (
    <div className="flex flex-col gap-1">
      <div className="border border-gray-100 rounded-lg p-2 text-center bg-gray-50">
        <p className="text-xs font-semibold text-gray-700 leading-tight">
          {dateLabel(day)}
        </p>
        {loading ? (
          <LucideLoader2
            size={12}
            className="animate-spin text-gray-300 mx-auto mt-1"
          />
        ) : (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {slots.length === 0
              ? "No slots"
              : slots.length + " slot" + (slots.length !== 1 ? "s" : "")}
          </p>
        )}
      </div>

      {!loading && slots.length > 0 && (
        <button
          onClick={() => setOffset(Math.max(0, offset - 1))}
          disabled={!canUp}
          className="flex items-center justify-center py-0.5 rounded hover:bg-gray-100 disabled:opacity-20 transition-opacity"
        >
          <LucideChevronUp size={14} className="text-gray-500" />
        </button>
      )}

      {!loading && slots.length > 0 && (
        <div className="flex flex-col gap-1" style={{ minHeight: `${SLOTS_PER_PAGE * 38}px` }}>
          {visible.map((slot) => (
            <button
              key={slot.start_time}
              onClick={() => onBook(slot)}
              className="text-xs py-2 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 border border-blue-100 transition-colors w-full"
            >
              {formatTime(slot.start_time)}
            </button>
          ))}
        </div>
      )}

      {!loading && slots.length > 0 && (
        <button
          onClick={() => setOffset(Math.min(slots.length - SLOTS_PER_PAGE, offset + 1))}
          disabled={!canDown}
          className="flex items-center justify-center py-0.5 rounded hover:bg-gray-100 disabled:opacity-20 transition-opacity"
        >
          <LucideChevronDown size={14} className="text-gray-500" />
        </button>
      )}

      {!loading && slots.length === 0 && (
        <div
          className="flex items-center justify-center text-[10px] text-gray-300"
          style={{ minHeight: `${SLOTS_PER_PAGE * 38}px` }}
        >
          —
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Provider card — wide left panel layout
// ─────────────────────────────────────────────
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

  // NEW: which of the provider's facilities is selected for physical
  // bookings. Defaults to the primary (or first) location so a
  // single-location provider never requires the patient to make a choice.
  const hasLocations = (provider.locations?.length ?? 0) > 0;
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    () => getPrimaryLocation(provider.locations)?.id ?? null
  );

  const visibleDays = days.slice(dayOffset, dayOffset + 3);

  // NEW: cache key folds in appointment type + location, since the
  // available-slots response now differs by location_id -- without this,
  // switching facilities (or virtual <-> physical) would keep showing
  // slots fetched under the previous filter.
  const cacheKey = useCallback(
    (day: string) =>
      day +
      "|" +
      selectedApptType +
      "|" +
      (selectedApptType === "physical" ? selectedLocationId ?? "" : ""),
    [selectedApptType, selectedLocationId]
  );

  const fetchDay = useCallback(
    (day: string) => {
      const key = cacheKey(day);
      setLoadingDays((prev) => ({ ...prev, [key]: true }));
      const params = new URLSearchParams({ date: day });
      if (selectedApptType === "physical" && selectedLocationId) {
        params.set("location_id", selectedLocationId);
      }
      axiosClient
        .get("/provider/" + provider.id + "/available-slots?" + params.toString())
        .then((res) =>
          setDaySlots((prev) => ({ ...prev, [key]: res.data ?? [] }))
        )
        .catch(() => setDaySlots((prev) => ({ ...prev, [key]: [] })))
        .finally(() =>
          setLoadingDays((prev) => ({ ...prev, [key]: false }))
        );
    },
    [provider.id, selectedApptType, selectedLocationId, cacheKey]
  );

  useEffect(() => {
    visibleDays.forEach((day) => {
      if (daySlots[cacheKey(day)] !== undefined) return;
      fetchDay(day);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOffset, provider.id, selectedApptType, selectedLocationId]);

  const invalidateDay = (date: string) => {
    const key = cacheKey(date);
    setDaySlots((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    fetchDay(date);
  };

  const slotsForDay = (day: string) => {
    const allSlots = daySlots[cacheKey(day)] ?? [];
    const now = new Date();
    return allSlots.filter((slot) => {
      if (new Date(slot.start_time) <= now) return false;
      if (selectedServiceId && slot.service_id && slot.service_id !== selectedServiceId)
        return false;
      if (slot.location_type !== "both" && slot.location_type !== selectedApptType)
        return false;
      return true;
    });
  };

  const handleBookSlot = (slot: Slot, day: string) => {
    // Defensive guard: with hasLocations gating the "In-person" toggle
    // below, this should be unreachable in practice, but avoids ever
    // submitting a physical booking with no location if that invariant
    // is ever violated.
    if (selectedApptType === "physical" && hasLocations && !selectedLocationId) {
      return;
    }
    const location =
      selectedApptType === "physical"
        ? provider.locations?.find((l) => l.id === selectedLocationId) ?? null
        : null;

    onBook({
      provider,
      slot,
      date: day,
      appointmentType: selectedApptType,
      locationId: location?.id ?? null,
      locationName: location?.name ?? null,
      _invalidate: () => invalidateDay(day),
    });
  };

  const selectedService =
    provider.services.find((s) => s.id === selectedServiceId) ??
    provider.services[0] ??
    null;

  const insuranceSummary =
    provider.insurances_accepted?.length > 0
      ? provider.insurances_accepted.length > 2
        ? provider.insurances_accepted.slice(0, 2).join(", ") +
          " +" +
          (provider.insurances_accepted.length - 2) +
          " more"
        : provider.insurances_accepted.join(", ")
      : null;

  const languageSummary =
    provider.languages?.length > 0 ? provider.languages.join(", ") : null;

  const locationLabel = getLocationLabel(provider);

  const allVisibleDaysLoaded = visibleDays.every((day) => !loadingDays[cacheKey(day)]);
  const anyVisibleDayHasSlots = visibleDays.some(
    (day) => !loadingDays[cacheKey(day)] && slotsForDay(day).length > 0
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── IDENTITY STRIP (horizontal, full width) ── */}
      <div className="flex items-start gap-4 p-5 border-b border-gray-100">
        <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-blue-50">
          <ProviderAvatarLarge provider={provider} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base leading-tight">
              {provider.title || "Dr."} {provider.first_name} {provider.last_name}
            </h3>
            <span className="text-sm text-blue-600 font-medium">
              {provider.speciality || "General Practitioner"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-1">
            {/* Star rating summary — only shown once at least one review exists */}
            {typeof provider.average_rating === "number" && (provider.review_count ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <StarRow rating={provider.average_rating} size={12} />
                <span className="text-xs font-semibold text-gray-700">
                  {provider.average_rating.toFixed(1)}
                </span>
                <span className="text-[11px] text-gray-400">
                  ({provider.review_count})
                </span>
              </div>
            )}
            {provider.subspecialties && provider.subspecialties.length > 0 && (
              <>
                {typeof provider.average_rating === "number" && (provider.review_count ?? 0) > 0 && (
                  <span className="text-gray-300">·</span>
                )}
                <span className="text-xs text-gray-500">
                  {provider.subspecialties.join(" · ")}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap mt-2">
            {locationLabel && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <LucideMapPin size={12} className="shrink-0" />
                {locationLabel}
                {(provider.locations?.length ?? 0) > 1 && (
                  <span className="text-blue-600 font-medium">
                    +{(provider.locations!.length - 1)} more
                  </span>
                )}
              </span>
            )}
            {languageSummary && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <LucideLanguages size={12} className="shrink-0" />
                {languageSummary}
              </span>
            )}
            {insuranceSummary && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <LucideShieldCheck size={12} className="shrink-0" />
                {insuranceSummary}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          {selectedService && (
            <>
              <p className="text-[11px] text-gray-400">{selectedService.name}</p>
              {selectedService.price != null && (
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {selectedService.currency}{" "}
                  {Number(selectedService.price).toLocaleString()}
                </p>
              )}
            </>
          )}
          <button
            onClick={() => router.push("/book/provider/" + provider.id)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1.5 ml-auto"
          >
            Full profile <LucideChevronRightCircle size={13} />
          </button>
        </div>
      </div>

      {/* ── CONTROLS ROW (services + appointment type, full width) ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap p-4 border-b border-gray-100">
        {provider.services.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {provider.services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedServiceId(s.id)}
                className={
                  "text-xs px-3 py-1.5 rounded-lg border transition-colors " +
                  (selectedServiceId === s.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 text-gray-600 hover:border-gray-300")
                }
              >
                {s.name} · {s.estimated_duration} mins
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedApptType("virtual")}
            className={
              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors " +
              (selectedApptType === "virtual"
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                : "border-gray-200 text-gray-600")
            }
          >
            <LucideVideo size={13} /> Virtual
          </button>
          {/* Only offered when the provider actually has a facility to send
              the patient to -- a provider with no approved locations has
              no valid "In-person" option at all. */}
          {hasLocations && (
            <button
              onClick={() => setSelectedApptType("physical")}
              className={
                "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors " +
                (selectedApptType === "physical"
                  ? "bg-green-50 border-green-300 text-green-700 font-medium"
                  : "border-gray-200 text-gray-600")
              }
            >
              <LucideMapPin size={13} /> In-person
            </button>
          )}

          {/* NEW: facility picker -- only rendered once physical is
              selected and the provider actually has more than one
              location. A single-location provider never needs this;
              selectedLocationId is already defaulted to that one
              location. */}
          {selectedApptType === "physical" && (provider.locations?.length ?? 0) > 1 && (
            <select
              value={selectedLocationId ?? ""}
              onChange={(e) => setSelectedLocationId(e.target.value || null)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 bg-white focus:outline-none focus:border-blue-400"
            >
              {provider.locations!.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── AVAILABILITY (full width) ── */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Availability
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setDayOffset(Math.max(0, dayOffset - 3))}
              disabled={dayOffset === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <LucideChevronLeft size={14} />
            </button>
            <button
              onClick={() =>
                setDayOffset(Math.min(days.length - 3, dayOffset + 3))
              }
              disabled={dayOffset + 3 >= days.length}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <LucideChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {visibleDays.map((day) => (
            <SlotColumn
              key={day}
              day={day}
              slots={slotsForDay(day)}
              loading={!!loadingDays[cacheKey(day)]}
              onBook={(slot) => handleBookSlot(slot, day)}
            />
          ))}
        </div>

        {allVisibleDaysLoaded && !anyVisibleDayHasSlots && (
          <p className="text-xs text-gray-400 text-center mt-3">
            No bookable times in this range for{" "}
            {selectedService?.name ?? "this service"} ·{" "}
            {selectedApptType === "virtual" ? "Virtual" : "In-person"}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Booking modal
// ─────────────────────────────────────────────
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
    // NEW: mirrors ProviderAppointmentSerializer.validate() -- a physical
    // booking with no location would just come back as a 400 from the
    // backend, so catch it client-side first with a clearer message.
    if (booking.appointmentType === "physical" && !booking.locationId) {
      setError("Please select which location this appointment is at.");
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
          // NEW: only sent for physical bookings -- ProviderAppointmentSerializer
          // itself nulls out a stray location on virtual bookings anyway, but
          // there's no reason to send one that doesn't apply.
          location: booking.appointmentType === "physical" ? booking.locationId : null,
          service: booking.slot.service_id,
          message,
          status: "scheduled",
        }
      );
      booking._invalidate?.();
      onConfirmed();
    } catch (err: any) {
      const backendError = err?.response?.data?.error;
      // NEW: surface a location-specific validation message if that's
      // what the backend rejected on (e.g. a stale location that no
      // longer belongs to this provider), rather than a generic failure.
      const locationError = err?.response?.data?.location;
      if (err?.response?.status === 409) {
        setError(backendError || "This time slot was just booked by someone else.");
        booking._invalidate?.();
      } else if (locationError) {
        setError(
          Array.isArray(locationError) ? locationError[0] : String(locationError)
        );
      } else {
        setError(backendError || "Booking failed. Please try again.");
      }
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
          <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
            <ProviderAvatar provider={booking.provider} />
            <div>
              <p className="font-semibold text-gray-800">
                {booking.provider.title || "Dr."} {booking.provider.first_name} {booking.provider.last_name}
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
            {/* NEW: shows which facility, when physical */}
            {booking.appointmentType === "physical" && booking.locationName && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-600">{booking.locationName}</span>
              </>
            )}
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

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
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
      (p.subspecialties ?? []).some((sub) => sub.toLowerCase().includes(q)) ||
      p.services.some((s) => s.name.toLowerCase().includes(q)) ||
      (p.insurances_accepted ?? []).some((ins) => ins.toLowerCase().includes(q))
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
        message:
          "We couldn't load your account details. Please refresh and try again.",
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
