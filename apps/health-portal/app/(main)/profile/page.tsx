"use client";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import { toast } from "sonner";
import {
  LucideUser,
  LucideMail,
  LucidePhone,
  LucideLoader2,
  LucideSave,
} from "@veridoctor/design/icons";

/**
 * Identity in the Redux store has been seen nested or JSON-stringified in
 * past bugs (see the booking page fix), so this walks the object safely
 * instead of assuming a flat shape.
 */
function extractIdentityField(source: unknown, field: string): string {
  if (!source) return "";
  if (typeof source === "string") {
    try {
      return extractIdentityField(JSON.parse(source), field);
    } catch {
      return "";
    }
  }
  if (typeof source === "object") {
    const obj = source as Record<string, unknown>;
    if (field in obj) {
      const val = obj[field];
      if (typeof val === "string") return val;
      if (val && typeof val === "object") {
        const nested = extractIdentityField(val, field);
        if (nested) return nested;
      }
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && (typeof val === "object" || typeof val === "string")) {
        const found = extractIdentityField(val, field);
        if (found) return found;
      }
    }
  }
  return "";
}

interface ProfileFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
}

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "UNKNOWN", label: "Prefer not to say" },
];

export default function ProfilePage() {
  const { identity } = useAppSelector((store) => store.auth);
  const identityId = extractIdentityField(identity, "id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileFormState>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    gender: "",
  });

  useEffect(() => {
    if (!identityId) {
      setLoading(false);
      return;
    }
    const fetchIdentity = async () => {
      try {
        const res = await axiosClient.get(`/identity/register/${identityId}`);
        setForm({
          first_name: res.data.first_name ?? "",
          last_name: res.data.last_name ?? "",
          email: res.data.email ?? "",
          phone_number: res.data.phone_number ?? "",
          gender: res.data.gender ?? "",
        });
      } catch (err) {
        toast.error("Could not load your profile. Try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };
    fetchIdentity();
  }, [identityId]);

  const handleChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!identityId) {
      toast.error("Could not determine your account. Try logging in again.");
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    setSaving(true);
    try {
      await axiosClient.patch(`/identity/register/${identityId}`, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone_number: form.phone_number,
        gender: form.gender,
      });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error("Could not save changes. Please try again.");
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

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border p-6 mt-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
          {(form.first_name[0] ?? "") + (form.last_name[0] ?? "")}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-400">
            Update your personal details below
          </p>
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
            Contact support to change your email address.
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

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
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
