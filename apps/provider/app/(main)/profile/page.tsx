"use client";
import { useEffect, useState, useRef } from "react";
import { useAppSelector } from "../../hooks";
import { axiosClient } from "@veridoctor/api-client";
import {
  LucideUser,
  LucideMapPin,
  LucideBriefcase,
  LucidePhone,
  LucideShield,
  LucideCamera,
  LucideLoader2,
  LucideCheck,
  LucidePencil,
} from "@veridoctor/design/icons";

interface ProviderProfile {
  first_name: string;
  last_name: string;
  email: string;
  title: string;
  speciality: string;
  phone_number: string;
  licence_number: string;
  licence_type: string;
  clinic_name: string;
  address: string;
  county: string;
  country: string;
  bio: string;
  insurances_accepted: string[];
  languages: string[];
  profile_picture_url: string;
}

const KENYAN_COUNTIES = [
  "Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Malindi","Kitale",
  "Garissa","Kakamega","Nyeri","Machakos","Meru","Kisii","Kilifi","Kericho",
  "Embu","Migori","Homa Bay","Bungoma","Uasin Gishu","Trans Nzoia","Nandi",
  "Bomet","Murang'a","Kiambu","Kajiado","Makueni","Kitui","Kwale","Taita Taveta",
  "Tana River","Lamu","Isiolo","Marsabit","Moyale","Mandera","Wajir","Samburu",
  "Laikipia","Nyandarua","Kirinyaga","Tharaka Nithi","Vihiga","Busia","Siaya",
  "Rachuonyo","West Pokot","Elgeyo Marakwet","Baringo",
];

const COMMON_INSURANCES = [
  "NHIF","AAR","Jubilee","Britam","CIC","Madison","Resolution Health",
  "Sanlam","GA Insurance","Pacis","APA Insurance","Equity Afia","Old Mutual",
  "Pioneer Assurance","Kenindia","Heritage","Cannon","UAP","ICEA Lion",
];

const SPECIALITIES = [
  "General Practitioner","Cardiologist","Dermatologist","Endocrinologist",
  "Gastroenterologist","Gynecologist","Neurologist","Oncologist","Ophthalmologist",
  "Orthopedic Surgeon","Pediatrician","Psychiatrist","Pulmonologist","Radiologist",
  "Rheumatologist","Urologist","ENT Specialist","Dentist","Physiotherapist",
  "Nutritionist","Pharmacist","Anesthesiologist","General Surgeon",
];

// `identity` from Redux is a raw ID string (rehydrated from localStorage),
// but handle object/JSON-string shapes defensively.
function getIdentityId(identity: unknown): string {
  if (typeof identity === "string") {
    if (!identity) return "";
    try {
      const parsed = JSON.parse(identity);
      if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
        return parsed.id;
      }
    } catch {
      // not JSON — it's the raw identity ID itself
    }
    return identity;
  }
  if (identity && typeof identity === "object" && "id" in identity) {
    const val = (identity as Record<string, unknown>).id;
    if (typeof val === "string") return val;
  }
  return "";
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={"fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 " + (type === "success" ? "bg-green-600" : "bg-red-600")}>
      {type === "success" ? <LucideCheck size={16} /> : null}
      {message}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="text-blue-600">{icon}</div>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-gray-50 w-full";
const selectClass = inputClass;

export default function ProfilePage() {
  const { identity } = useAppSelector((store) => store.auth);

  // ✅ Fixed: was checking typeof identity === "object" which fails for raw string IDs
  const identityId = getIdentityId(identity);

  const [profile, setProfile] = useState<ProviderProfile>({
    first_name: "", last_name: "", email: "", title: "Dr.",
    speciality: "", phone_number: "", licence_number: "", licence_type: "",
    clinic_name: "", address: "", county: "", country: "Kenya",
    bio: "", insurances_accepted: [], languages: ["English"],
    profile_picture_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [insuranceInput, setInsuranceInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!identityId) {
      setLoading(false); // ✅ Don't spin forever if no identity
      return;
    }
    axiosClient
      .get("/provider/" + identityId + "/profile")
      .then((res) => {
        setProfile((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [identityId]);

  const set = (field: keyof ProviderProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const toggleInsurance = (ins: string) => {
    setProfile((prev) => ({
      ...prev,
      insurances_accepted: prev.insurances_accepted.includes(ins)
        ? prev.insurances_accepted.filter((i) => i !== ins)
        : [...prev.insurances_accepted, ins],
    }));
  };

  const addCustomInsurance = () => {
    const val = insuranceInput.trim();
    if (!val) return;
    if (!profile.insurances_accepted.includes(val)) {
      setProfile((prev) => ({ ...prev, insurances_accepted: [...prev.insurances_accepted, val] }));
    }
    setInsuranceInput("");
  };

  const addLanguage = () => {
    const val = languageInput.trim();
    if (!val) return;
    if (!profile.languages.includes(val)) {
      setProfile((prev) => ({ ...prev, languages: [...prev.languages, val] }));
    }
    setLanguageInput("");
  };

  const removeLanguage = (lang: string) => {
    setProfile((prev) => ({ ...prev, languages: prev.languages.filter((l) => l !== lang) }));
  };

  const handleSave = async () => {
    if (!identityId) return;
    setSaving(true);
    try {
      await axiosClient.patch("/provider/" + identityId + "/profile", {
        first_name: profile.first_name,
        last_name: profile.last_name,
        speciality: profile.speciality,
        phone_number: profile.phone_number,
        licence_number: profile.licence_number,
        licence_type: profile.licence_type,
        clinic_name: profile.clinic_name,
        address: profile.address,
        county: profile.county,
        country: profile.country,
        bio: profile.bio,
        insurances_accepted: profile.insurances_accepted,
        languages: profile.languages,
      });
      setToast({ message: "Profile updated successfully!", type: "success" });
    } catch {
      setToast({ message: "Failed to save profile", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LucideLoader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const initials =
    (profile.first_name[0] ?? "") + (profile.last_name[0] ?? "");

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold border-2 border-white/40">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials.toUpperCase() || <LucideUser size={28} />
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow text-blue-600 hover:bg-blue-50"
          >
            <LucideCamera size={14} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" />
        </div>
        <div>
          <h1 className="text-xl font-bold">
            {profile.title} {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-blue-100 text-sm mt-0.5">
            {profile.speciality || "Healthcare Provider"}
          </p>
          {profile.clinic_name && (
            <p className="text-blue-200 text-xs mt-0.5">{profile.clinic_name}</p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-50 disabled:opacity-60"
        >
          {saving ? <LucideLoader2 size={14} className="animate-spin" /> : <LucidePencil size={14} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Personal Info */}
      <Section title="Personal Information" icon={<LucideUser size={18} />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title">
            <select value={profile.title} onChange={(e) => set("title", e.target.value)} className={selectClass}>
              {["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Nurse"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Speciality">
            <select value={profile.speciality} onChange={(e) => set("speciality", e.target.value)} className={selectClass}>
              <option value="">Select speciality</option>
              {SPECIALITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="First Name">
            <input value={profile.first_name} onChange={(e) => set("first_name", e.target.value)} className={inputClass} placeholder="First name" />
          </Field>
          <Field label="Last Name">
            <input value={profile.last_name} onChange={(e) => set("last_name", e.target.value)} className={inputClass} placeholder="Last name" />
          </Field>
          <Field label="Email">
            <input value={profile.email} disabled className={inputClass + " opacity-50 cursor-not-allowed"} />
          </Field>
          <Field label="Phone Number">
            <input value={profile.phone_number} onChange={(e) => set("phone_number", e.target.value)} className={inputClass} placeholder="+254 700 000 000" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Bio / About">
            <textarea
              value={profile.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={3}
              placeholder="Tell patients about your experience and approach to care..."
              className={inputClass + " resize-none"}
            />
          </Field>
        </div>
      </Section>

      {/* Practice Info */}
      <Section title="Practice & Location" icon={<LucideMapPin size={18} />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Clinic / Hospital Name">
            <input value={profile.clinic_name} onChange={(e) => set("clinic_name", e.target.value)} className={inputClass} placeholder="e.g. Nairobi Women's Hospital" />
          </Field>
          <Field label="County">
            <select value={profile.county} onChange={(e) => set("county", e.target.value)} className={selectClass}>
              <option value="">Select county</option>
              {KENYAN_COUNTIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Address / Street">
            <input value={profile.address} onChange={(e) => set("address", e.target.value)} className={inputClass} placeholder="e.g. Argwings Kodhek Rd, Hurlingham" />
          </Field>
          <Field label="Country">
            <input value={profile.country} onChange={(e) => set("country", e.target.value)} className={inputClass} placeholder="Kenya" />
          </Field>
        </div>
      </Section>

      {/* Licence */}
      <Section title="Professional Credentials" icon={<LucideBriefcase size={18} />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Licence Number">
            <input value={profile.licence_number} onChange={(e) => set("licence_number", e.target.value)} className={inputClass} placeholder="e.g. KMP/12345" />
          </Field>
          <Field label="Licence Type">
            <select value={profile.licence_type} onChange={(e) => set("licence_type", e.target.value)} className={selectClass}>
              <option value="">Select type</option>
              {["Medical Practitioner","Dental Surgeon","Pharmacist","Nurse","Clinical Officer","Physiotherapist","Nutritionist","Psychologist","Radiographer"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Languages */}
      <Section title="Languages Spoken" icon={<LucidePhone size={18} />}>
        <div className="flex flex-wrap gap-2 mb-3">
          {profile.languages.map((lang) => (
            <span key={lang} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-medium">
              {lang}
              <button onClick={() => removeLanguage(lang)} className="ml-1 text-blue-400 hover:text-red-500">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={languageInput}
            onChange={(e) => setLanguageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLanguage()}
            placeholder="Add a language..."
            className={inputClass + " flex-1"}
          />
          <button onClick={addLanguage} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            Add
          </button>
        </div>
      </Section>

      {/* Insurances */}
      <Section title="Insurances Accepted" icon={<LucideShield size={18} />}>
        <div className="flex flex-wrap gap-2 mb-4">
          {COMMON_INSURANCES.map((ins) => (
            <button
              key={ins}
              onClick={() => toggleInsurance(ins)}
              className={
                "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors " +
                (profile.insurances_accepted.includes(ins)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600")
              }
            >
              {ins}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={insuranceInput}
            onChange={(e) => setInsuranceInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomInsurance()}
            placeholder="Add other insurance..."
            className={inputClass + " flex-1"}
          />
          <button onClick={addCustomInsurance} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            Add
          </button>
        </div>
        {profile.insurances_accepted.filter((i) => !COMMON_INSURANCES.includes(i)).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.insurances_accepted
              .filter((i) => !COMMON_INSURANCES.includes(i))
              .map((ins) => (
                <span key={ins} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full font-medium">
                  {ins}
                  <button onClick={() => toggleInsurance(ins)} className="ml-1 text-green-400 hover:text-red-500">&times;</button>
                </span>
              ))}
          </div>
        )}
      </Section>

      {/* Save button at bottom */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saving ? <LucideLoader2 size={16} className="animate-spin" /> : <LucideCheck size={16} />}
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
