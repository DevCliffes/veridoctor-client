"use client";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/app/hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideUser,
  LucideMail,
  LucidePhone,
  LucideLoader2,
  LucideSave,
  LucideShield,
  LucidePlus,
  LucideX,
  LucideChevronDown,
} from "@veridoctor/design/icons";

interface InsuranceEntry {
  id: string;
  provider: string;
  policy_number: string;
  principal_member: string;
  scheme_name: string;
}

interface ProfileFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
  insurances: InsuranceEntry[];
}

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "UNKNOWN", label: "Prefer not to say" },
];

const COMMON_INSURANCES = [
  "NHIF", "AAR", "Jubilee", "Britam", "CIC", "Madison", "Resolution Health",
  "Sanlam", "GA Insurance", "Pacis", "APA Insurance", "Equity Afia", "Old Mutual",
  "Pioneer Assurance", "Kenindia", "Heritage", "Cannon", "UAP", "ICEA Lion",
];

function newEntry(): InsuranceEntry {
  return {
    id: "ins_" + Date.now(),
    provider: "",
    policy_number: "",
    principal_member: "",
    scheme_name: "",
  };
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

function InsuranceCard({
  entry,
  onChange,
  onRemove,
}: {
  entry: InsuranceEntry;
  onChange: (updated: InsuranceEntry) => void;
  onRemove: () => void;
}) {
  const [customProvider, setCustomProvider] = useState(
    COMMON_INSURANCES.includes(entry.provider) ? "" : entry.provider
  );
  const [showCustom, setShowCustom] = useState(
    !!entry.provider && !COMMON_INSURANCES.includes(entry.provider)
  );

  const handleProviderChange = (val: string) => {
    if (val === "__custom__") {
      setShowCustom(true);
      onChange({ ...entry, provider: customProvider });
    } else {
      setShowCustom(false);
      onChange({ ...entry, provider: val });
    }
  };

  const handleCustomChange = (val: string) => {
    setCustomProvider(val);
    onChange({ ...entry, provider: val });
  };

  const inputClass =
    "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-gray-50 w-full";

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <LucideShield size={14} />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {entry.provider || "New Insurance"}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <LucideX size={15} />
        </button>
      </div>

      {/* Provider dropdown */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          Insurance Provider
        </label>
        <div className="relative">
          <select
            value={showCustom ? "__custom__" : entry.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className={inputClass + " appearance-none pr-8"}
          >
            <option value="">Select provider...</option>
            {COMMON_INSURANCES.map((ins) => (
              <option key={ins} value={ins}>
                {ins}
              </option>
            ))}
            <option value="__custom__">Other (type below)</option>
          </select>
          <LucideChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
        {showCustom && (
          <input
            value={customProvider}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Type insurance provider name..."
            className={inputClass + " mt-1"}
            autoFocus
          />
        )}
      </div>

      {/* Policy number */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          Policy / Member Number
        </label>
        <input
          value={entry.policy_number}
          onChange={(e) => onChange({ ...entry, policy_number: e.target.value })}
          placeholder="e.g. NHIF-1234567"
          className={inputClass}
        />
      </div>

      {/* Principal member */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          Principal Member Name
        </label>
        <input
          value={entry.principal_member}
          onChange={(e) =>
            onChange({ ...entry, principal_member: e.target.value })
          }
          placeholder="e.g. John Doe (leave blank if you are the principal)"
          className={inputClass}
        />
      </div>

      {/* Scheme / plan */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          Scheme / Plan Name
        </label>
        <input
          value={entry.scheme_name}
          onChange={(e) => onChange({ ...entry, scheme_name: e.target.value })}
          placeholder="e.g. Inpatient + Outpatient, Family Plan"
          className={inputClass}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { identity } = useAppSelector((store) => store.auth);
  const identityId = typeof identity === "string" ? identity : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [form, setForm] = useState<ProfileFormState>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    gender: "",
    insurances: [],
  });

  useEffect(() => {
    if (!identityId) {
      setLoading(false);
      return;
    }
    axiosClient
      .get(`/identity/register/${identityId}`)
      .then((res) => {
        // Migrate old string[] format to InsuranceEntry[] gracefully
        const raw = res.data.insurances ?? [];
        const insurances: InsuranceEntry[] = raw.map(
          (item: InsuranceEntry | string) => {
            if (typeof item === "string") {
              return {
                id: "ins_" + Math.random(),
                provider: item,
                policy_number: "",
                principal_member: "",
                scheme_name: "",
              };
            }
            return item;
          }
        );
        setForm({
          first_name: res.data.first_name ?? "",
          last_name: res.data.last_name ?? "",
          email: res.data.email ?? "",
          phone_number: res.data.phone_number ?? "",
          gender: res.data.gender ?? "",
          insurances,
        });
      })
      .catch(() =>
        setToast({ message: "Could not load profile. Try refreshing.", type: "error" })
      )
      .finally(() => setLoading(false));
  }, [identityId]);

  const handleChange = (field: keyof ProfileFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addInsurance = () =>
    setForm((prev) => ({ ...prev, insurances: [...prev.insurances, newEntry()] }));

  const updateInsurance = (updated: InsuranceEntry) =>
    setForm((prev) => ({
      ...prev,
      insurances: prev.insurances.map((i) => (i.id === updated.id ? updated : i)),
    }));

  const removeInsurance = (id: string) =>
    setForm((prev) => ({
      ...prev,
      insurances: prev.insurances.filter((i) => i.id !== id),
    }));

  const handleSave = async () => {
    if (!identityId) {
      setToast({ message: "Could not determine your account.", type: "error" });
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setToast({ message: "First and last name are required.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await axiosClient.patch(`/identity/register/${identityId}`, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone_number: form.phone_number,
        gender: form.gender,
        insurances: form.insurances,
      });
      setToast({ message: "Profile updated.", type: "success" });
    } catch {
      setToast({ message: "Could not save changes. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LucideLoader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  const initials = (form.first_name[0] ?? "") + (form.last_name[0] ?? "");

  return (
    <div className="max-w-2xl mx-auto space-y-4 mt-4 pb-10">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Personal details card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
            {initials.toUpperCase() || <LucideUser size={20} />}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">My Profile</h1>
            <p className="text-sm text-gray-400">Update your personal details below</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              First Name
            </label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
              <LucideUser size={16} className="text-gray-400" />
              <input
                className="w-full text-sm outline-none"
                value={form.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Last Name
            </label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
              <LucideUser size={16} className="text-gray-400" />
              <input
                className="w-full text-sm outline-none"
                value={form.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Email
            </label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2 bg-gray-50">
              <LucideMail size={16} className="text-gray-400" />
              <input
                className="w-full text-sm outline-none bg-gray-50 text-gray-500"
                value={form.email}
                disabled
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Contact support to change your email.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Phone Number
            </label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
              <LucidePhone size={16} className="text-gray-400" />
              <input
                className="w-full text-sm outline-none"
                value={form.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Gender
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
              value={form.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Insurance section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LucideShield size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">My Insurances</h2>
          </div>
          <button
            onClick={addInsurance}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <LucidePlus size={15} />
            Add insurance
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Add your insurance details so doctors can see your coverage during
          appointments.
        </p>

        {form.insurances.length === 0 ? (
          <button
            onClick={addInsurance}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
          >
            <LucidePlus size={16} />
            Add your first insurance
          </button>
        ) : (
          <div className="space-y-3">
            {form.insurances.map((entry) => (
              <InsuranceCard
                key={entry.id}
                entry={entry}
                onChange={updateInsurance}
                onRemove={() => removeInsurance(entry.id)}
              />
            ))}
            <button
              onClick={addInsurance}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
            >
              <LucidePlus size={14} />
              Add another insurance
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? (
            <LucideLoader2 size={16} className="animate-spin" />
          ) : (
            <LucideSave size={16} />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
