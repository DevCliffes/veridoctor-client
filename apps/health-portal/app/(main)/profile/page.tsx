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
} from "@veridoctor/design/icons";

interface ProfileFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
  insurances: string[];
}

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "UNKNOWN", label: "Prefer not to say" },
];

const COMMON_INSURANCES = [
  "NHIF","AAR","Jubilee","Britam","CIC","Madison","Resolution Health",
  "Sanlam","GA Insurance","Pacis","APA Insurance","Equity Afia","Old Mutual",
  "Pioneer Assurance","Kenindia","Heritage","Cannon","UAP","ICEA Lion",
];

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={"fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium " + (type === "success" ? "bg-green-600" : "bg-red-600")}>
      {message}
    </div>
  );
}

export default function ProfilePage() {
  const { identity } = useAppSelector((store) => store.auth);
  const identityId = typeof identity === "string" ? identity : "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [insuranceInput, setInsuranceInput] = useState("");
  const [form, setForm] = useState<ProfileFormState>({
    first_name: "", last_name: "", email: "", phone_number: "", gender: "", insurances: [],
  });

  useEffect(() => {
    if (!identityId) { setLoading(false); return; }
    axiosClient
      .get(`/identity/register/${identityId}`)
      .then((res) => {
        setForm({
          first_name: res.data.first_name ?? "",
          last_name: res.data.last_name ?? "",
          email: res.data.email ?? "",
          phone_number: res.data.phone_number ?? "",
          gender: res.data.gender ?? "",
          insurances: res.data.insurances ?? [],
        });
      })
      .catch(() => setToast({ message: "Could not load profile. Try refreshing.", type: "error" }))
      .finally(() => setLoading(false));
  }, [identityId]);

  const handleChange = (field: keyof ProfileFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleInsurance = (ins: string) =>
    setForm((prev) => ({
      ...prev,
      insurances: prev.insurances.includes(ins)
        ? prev.insurances.filter((i) => i !== ins)
        : [...prev.insurances, ins],
    }));

  const addCustomInsurance = () => {
    const val = insuranceInput.trim();
    if (!val || form.insurances.includes(val)) return;
    setForm((prev) => ({ ...prev, insurances: [...prev.insurances, val] }));
    setInsuranceInput("");
  };

  const removeInsurance = (ins: string) =>
    setForm((prev) => ({ ...prev, insurances: prev.insurances.filter((i) => i !== ins) }));

  const handleSave = async () => {
    if (!identityId) { setToast({ message: "Could not determine your account.", type: "error" }); return; }
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
            <label className="text-xs font-medium text-gray-500 mb-1 block">First Name</label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
              <LucideUser size={16} className="text-gray-400" />
              <input className="w-full text-sm outline-none" value={form.first_name} onChange={(e) => handleChange("first_name", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Last Name</label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
              <LucideUser size={16} className="text-gray-400" />
              <input className="w-full text-sm outline-none" value={form.last_name} onChange={(e) => handleChange("last_name", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2 bg-gray-50">
              <LucideMail size={16} className="text-gray-400" />
              <input className="w-full text-sm outline-none bg-gray-50 text-gray-500" value={form.email} disabled />
            </div>
            <p className="text-xs text-gray-400 mt-1">Contact support to change your email.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phone Number</label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
              <LucidePhone size={16} className="text-gray-400" />
              <input className="w-full text-sm outline-none" value={form.phone_number} onChange={(e) => handleChange("phone_number", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Gender</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm outline-none" value={form.gender} onChange={(e) => handleChange("gender", e.target.value)}>
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Insurance section */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <LucideShield size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">My Insurances</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Select the insurance providers you are covered under. This helps doctors see your coverage during appointments.
        </p>

        {/* Common insurances chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {COMMON_INSURANCES.map((ins) => (
            <button
              key={ins}
              onClick={() => toggleInsurance(ins)}
              className={"text-xs px-3 py-1.5 rounded-full border font-medium transition-colors " + (form.insurances.includes(ins) ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600")}
            >
              {ins}
            </button>
          ))}
        </div>

        {/* Custom insurance input */}
        <div className="flex gap-2 mb-3">
          <div className="flex items-center border rounded-lg px-3 py-2 gap-2 flex-1">
            <LucidePlus size={14} className="text-gray-400" />
            <input
              value={insuranceInput}
              onChange={(e) => setInsuranceInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomInsurance()}
              placeholder="Add other insurance provider..."
              className="w-full text-sm outline-none"
            />
          </div>
          <button onClick={addCustomInsurance} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Add
          </button>
        </div>

        {/* Custom insurances */}
        {form.insurances.filter((i) => !COMMON_INSURANCES.includes(i)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.insurances.filter((i) => !COMMON_INSURANCES.includes(i)).map((ins) => (
              <span key={ins} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full font-medium">
                {ins}
                <button onClick={() => removeInsurance(ins)} className="ml-1 hover:text-red-500">
                  <LucideX size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {form.insurances.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">No insurances selected yet.</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <LucideLoader2 size={16} className="animate-spin" /> : <LucideSave size={16} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
