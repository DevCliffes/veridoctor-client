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
  LucideUpload,
  LucideFileText,
  LucidePlus,
  LucideTrash2,
  LucideBuilding,
} from "@veridoctor/design/icons";

interface ExtraCredential {
  id: string;
  name: string;
  number: string;
  image_url: string;
}

interface ProviderProfile {
  first_name: string;
  last_name: string;
  email: string;
  title: string;
  speciality: string;
  subspecialties: string[];
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
  national_id_number: string;
  national_id_image: string;
  clinic_logo_url: string;
  business_reg_number: string;
  business_reg_image: string;
  operating_licence: string;
  operating_licence_image: string;
  kra_pin: string;
  kra_pin_image: string;
  cr12_image: string;
  valid_licence_number: string;
  valid_licence_image: string;
  extra_credentials: ExtraCredential[];
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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function getIdentityId(identity: unknown): string {
  if (typeof identity === "string") {
    if (!identity) return "";
    try {
      const parsed = JSON.parse(identity);
      if (parsed && typeof parsed === "object" && typeof parsed.id === "string") return parsed.id;
    } catch {}
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

function DocumentImageUpload({
  label,
  fieldName,
  currentUrl,
  identityId,
  onUploaded,
}: {
  label: string;
  fieldName: string;
  currentUrl: string;
  identityId: string;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosClient.post(
        "/provider/" + identityId + "/document?field=" + fieldName,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data?.url) onUploaded(res.data.url);
    } catch {}
    finally { setUploading(false); }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</label>
      <div
        className="border border-dashed border-gray-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-blue-300 transition-colors bg-gray-50"
        onClick={() => fileRef.current?.click()}
      >
        {currentUrl ? (
          <img src={currentUrl} className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-100" alt={label} />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <LucideFileText size={16} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600 font-medium truncate">
            {uploading ? "Uploading…" : currentUrl ? "Change document" : "Upload document"}
          </p>
          <p className="text-xs text-gray-400">JPG, PNG or PDF · Max 5MB</p>
        </div>
        {uploading
          ? <LucideLoader2 size={16} className="animate-spin text-blue-500 shrink-0" />
          : <LucideUpload size={14} className="text-gray-400 shrink-0" />
        }
      </div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleChange} />
    </div>
  );
}

function LogoUpload({
  currentUrl,
  identityId,
  onUploaded,
}: {
  currentUrl: string;
  identityId: string;
  onUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosClient.post(
        "/provider/" + identityId + "/document?field=clinic_logo_url",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data?.url) onUploaded(res.data.url);
    } catch {}
    finally { setUploading(false); }
  };

  return (
    <div className="relative shrink-0">
      <div
        className="w-16 h-16 rounded-xl border-2 border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-300 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {uploading
          ? <LucideLoader2 size={18} className="animate-spin text-blue-500" />
          : currentUrl
          ? <img src={currentUrl} className="w-full h-full object-cover" alt="Clinic logo" />
          : <LucideBuilding size={22} className="text-gray-400" />
        }
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow text-blue-600 hover:bg-blue-50"
      >
        <LucideCamera size={12} />
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}

function ExtraCredentialCard({
  credential,
  identityId,
  onChange,
  onRemove,
}: {
  credential: ExtraCredential;
  identityId: string;
  onChange: (updated: ExtraCredential) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosClient.post(
        "/provider/" + identityId + "/upload-image?label=cred_" + credential.id,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data?.url) onChange({ ...credential, image_url: res.data.url });
    } catch {}
    finally { setUploading(false); }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Credential</p>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
          <LucideTrash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Credential Name</label>
          <input
            value={credential.name}
            onChange={(e) => onChange({ ...credential, name: e.target.value })}
            placeholder="e.g. KMPDB Registration"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Number / Reference</label>
          <input
            value={credential.number}
            onChange={(e) => onChange({ ...credential, number: e.target.value })}
            placeholder="e.g. KMPDB/12345"
            className={inputClass}
          />
        </div>
      </div>
      <div
        className="border border-dashed border-gray-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-blue-300 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {credential.image_url
          ? <img src={credential.image_url} className="w-10 h-10 object-cover rounded-lg shrink-0" alt="Credential" />
          : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><LucideFileText size={14} className="text-gray-400" /></div>
        }
        <p className="text-sm text-gray-500">
          {uploading ? "Uploading…" : credential.image_url ? "Change image" : "Upload credential image"}
        </p>
        {uploading && <LucideLoader2 size={14} className="animate-spin text-blue-500 ml-auto" />}
      </div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleImageChange} />
    </div>
  );
}

export default function ProfilePage() {
  const { identity } = useAppSelector((store) => store.auth);
  const identityId = getIdentityId(identity);

  const [profile, setProfile] = useState<ProviderProfile>({
    first_name: "", last_name: "", email: "", title: "Dr.",
    speciality: "", subspecialties: [], phone_number: "",
    licence_number: "", licence_type: "",
    clinic_name: "", address: "", county: "", country: "Kenya",
    bio: "", insurances_accepted: [], languages: ["English"],
    profile_picture_url: "",
    national_id_number: "", national_id_image: "",
    clinic_logo_url: "",
    business_reg_number: "", business_reg_image: "",
    operating_licence: "", operating_licence_image: "",
    kra_pin: "", kra_pin_image: "",
    cr12_image: "",
    valid_licence_number: "", valid_licence_image: "",
    extra_credentials: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [insuranceInput, setInsuranceInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [subspecialtyInput, setSubspecialtyInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!identityId) { setLoading(false); return; }
    axiosClient
      .get("/provider/" + identityId + "/profile")
      .then((res) =>
        setProfile((prev) => ({
          ...prev,
          ...res.data,
          // Ensure subspecialties is always an array even if API returns null
          subspecialties: res.data.subspecialties ?? [],
        }))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [identityId]);

  const set = (field: keyof ProviderProfile, value: string) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

  const toggleInsurance = (ins: string) =>
    setProfile((prev) => ({
      ...prev,
      insurances_accepted: prev.insurances_accepted.includes(ins)
        ? prev.insurances_accepted.filter((i) => i !== ins)
        : [...prev.insurances_accepted, ins],
    }));

  const addCustomInsurance = () => {
    const val = insuranceInput.trim();
    if (!val || profile.insurances_accepted.includes(val)) return;
    setProfile((prev) => ({ ...prev, insurances_accepted: [...prev.insurances_accepted, val] }));
    setInsuranceInput("");
  };

  const addLanguage = () => {
    const val = languageInput.trim();
    if (!val || profile.languages.includes(val)) return;
    setProfile((prev) => ({ ...prev, languages: [...prev.languages, val] }));
    setLanguageInput("");
  };

  const removeLanguage = (lang: string) =>
    setProfile((prev) => ({ ...prev, languages: prev.languages.filter((l) => l !== lang) }));

  // Subspecialty helpers — pill/chip pattern matching insurances:
  // a single text input + Add button, saved entries shown as removable pills.
  const addSubspecialty = () => {
    const val = subspecialtyInput.trim();
    if (!val || profile.subspecialties.includes(val)) return;
    setProfile((prev) => ({ ...prev, subspecialties: [...prev.subspecialties, val] }));
    setSubspecialtyInput("");
  };

  const removeSubspecialty = (sub: string) =>
    setProfile((prev) => ({
      ...prev,
      subspecialties: prev.subspecialties.filter((s) => s !== sub),
    }));

  const addExtraCredential = () => {
    const newCred: ExtraCredential = { id: "cred_" + Date.now(), name: "", number: "", image_url: "" };
    setProfile((prev) => ({ ...prev, extra_credentials: [...prev.extra_credentials, newCred] }));
  };

  const updateExtraCredential = (updated: ExtraCredential) =>
    setProfile((prev) => ({
      ...prev,
      extra_credentials: prev.extra_credentials.map((c) => c.id === updated.id ? updated : c),
    }));

  const removeExtraCredential = (id: string) =>
    setProfile((prev) => ({ ...prev, extra_credentials: prev.extra_credentials.filter((c) => c.id !== id) }));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setToast({ message: "Please select an image file.", type: "error" }); return; }
    if (file.size > MAX_PHOTO_BYTES) { setToast({ message: "Image too large. Max 5MB.", type: "error" }); return; }
    const localPreviewUrl = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, profile_picture_url: localPreviewUrl }));
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await axiosClient.post("/provider/" + identityId + "/photo", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const uploadedUrl = res.data?.profile_picture_url;
      if (uploadedUrl) {
        setProfile((prev) => ({ ...prev, profile_picture_url: uploadedUrl }));
        setToast({ message: "Profile photo updated!", type: "success" });
      }
    } catch {
      setProfile((prev) => ({ ...prev, profile_picture_url: prev.profile_picture_url === localPreviewUrl ? "" : prev.profile_picture_url }));
      setToast({ message: "Failed to upload photo.", type: "error" });
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!identityId) return;
    setSaving(true);
    try {
      await axiosClient.patch("/provider/" + identityId + "/profile", {
        first_name: profile.first_name,
        last_name: profile.last_name,
        title: profile.title,
        speciality: profile.speciality,
        subspecialties: profile.subspecialties,
        phone_number: profile.phone_number,
        bio: profile.bio,
        licence_number: profile.licence_number,
        licence_type: profile.licence_type,
        clinic_name: profile.clinic_name,
        address: profile.address,
        county: profile.county,
        country: profile.country,
        insurances_accepted: profile.insurances_accepted,
        languages: profile.languages,
        national_id_number: profile.national_id_number,
        business_reg_number: profile.business_reg_number,
        operating_licence: profile.operating_licence,
        kra_pin: profile.kra_pin,
        valid_licence_number: profile.valid_licence_number,
        extra_credentials: profile.extra_credentials,
      });
      setToast({ message: "Profile updated successfully!", type: "success" });
    } catch {
      setToast({ message: "Failed to save profile.", type: "error" });
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

  const initials = (profile.first_name[0] ?? "") + (profile.last_name[0] ?? "");

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header — single Save Changes button lives here only */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold border-2 border-white/40 overflow-hidden">
            {uploadingPhoto
              ? <LucideLoader2 size={22} className="animate-spin" />
              : profile.profile_picture_url
              ? <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
              : initials.toUpperCase() || <LucideUser size={28} />
            }
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow text-blue-600 hover:bg-blue-50 disabled:opacity-60"
          >
            <LucideCamera size={14} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div>
          <h1 className="text-xl font-bold">{profile.title} {profile.first_name} {profile.last_name}</h1>
          <p className="text-blue-100 text-sm mt-0.5">{profile.speciality || "Healthcare Provider"}</p>
          {profile.clinic_name && <p className="text-blue-200 text-xs mt-0.5">{profile.clinic_name}</p>}
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

      {/* Personal Information — Subspecialties now lives here, right after Speciality */}
      <Section title="Personal Information" icon={<LucideUser size={18} />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title">
            <select value={profile.title} onChange={(e) => set("title", e.target.value)} className={selectClass}>
              {["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Nurse"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Speciality">
            <select value={profile.speciality} onChange={(e) => set("speciality", e.target.value)} className={selectClass}>
              <option value="">Select speciality</option>
              {SPECIALITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Subspecialties — pill/chip pattern, matching Insurances styling */}
        <div className="mt-4">
          <Field label="Subspecialties">
            <div className="flex gap-2">
              <input
                value={subspecialtyInput}
                onChange={(e) => setSubspecialtyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubspecialty())}
                placeholder="Add other insurance..."
                className={inputClass + " flex-1"}
              />
              <button
                type="button"
                onClick={addSubspecialty}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shrink-0"
              >
                Add
              </button>
            </div>
          </Field>
          {profile.subspecialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.subspecialties.map((sub) => (
                <span key={sub} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full font-medium">
                  {sub}
                  <button onClick={() => removeSubspecialty(sub)} className="ml-1 text-green-400 hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Add specific areas of focus within your speciality (e.g. Pediatric Cardiology, Sports Medicine) — these appear on your public profile so patients can find you more easily.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
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
            <textarea value={profile.bio} onChange={(e) => set("bio", e.target.value)} rows={3} placeholder="Tell patients about your experience and approach to care..." className={inputClass + " resize-none"} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="National ID / Passport Number">
            <input value={profile.national_id_number} onChange={(e) => set("national_id_number", e.target.value)} className={inputClass} placeholder="e.g. 12345678 or A1234567" />
          </Field>
          <DocumentImageUpload
            label="National ID / Passport Image"
            fieldName="national_id_image"
            currentUrl={profile.national_id_image}
            identityId={identityId}
            onUploaded={(url) => setProfile((prev) => ({ ...prev, national_id_image: url }))}
          />
        </div>
      </Section>

      {/* Practice & Location */}
      <Section title="Practice & Location" icon={<LucideMapPin size={18} />}>
        <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <LogoUpload
            currentUrl={profile.clinic_logo_url}
            identityId={identityId}
            onUploaded={(url) => setProfile((prev) => ({ ...prev, clinic_logo_url: url }))}
          />
          <div className="flex-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide font-medium block mb-1">Clinic / Hospital Name</label>
            <input value={profile.clinic_name} onChange={(e) => set("clinic_name", e.target.value)} className={inputClass} placeholder="e.g. Nairobi Women's Hospital" />
            <p className="text-xs text-gray-400 mt-1">Click the logo to upload clinic logo</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="County">
            <select value={profile.county} onChange={(e) => set("county", e.target.value)} className={selectClass}>
              <option value="">Select county</option>
              {KENYAN_COUNTIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Address / Street">
            <input value={profile.address} onChange={(e) => set("address", e.target.value)} className={inputClass} placeholder="e.g. Argwings Kodhek Rd" />
          </Field>
          <Field label="Country">
            <input value={profile.country} onChange={(e) => set("country", e.target.value)} className={inputClass} placeholder="Kenya" />
          </Field>
        </div>

        {/* Business docs */}
        <div className="mt-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Facility Documents</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business Registration Number">
              <input value={profile.business_reg_number} onChange={(e) => set("business_reg_number", e.target.value)} className={inputClass} placeholder="e.g. BN/2024/12345" />
            </Field>
            <DocumentImageUpload
              label="Business Registration Certificate"
              fieldName="business_reg_image"
              currentUrl={profile.business_reg_image}
              identityId={identityId}
              onUploaded={(url) => setProfile((prev) => ({ ...prev, business_reg_image: url }))}
            />
            <Field label="Operating Licence Number">
              <input value={profile.operating_licence} onChange={(e) => set("operating_licence", e.target.value)} className={inputClass} placeholder="Licence number" />
            </Field>
            <DocumentImageUpload
              label="Operating Licence"
              fieldName="operating_licence_image"
              currentUrl={profile.operating_licence_image}
              identityId={identityId}
              onUploaded={(url) => setProfile((prev) => ({ ...prev, operating_licence_image: url }))}
            />
            <Field label="KRA PIN">
              <input value={profile.kra_pin} onChange={(e) => set("kra_pin", e.target.value)} className={inputClass} placeholder="e.g. A000000000B" />
            </Field>
            <DocumentImageUpload
              label="KRA PIN Certificate"
              fieldName="kra_pin_image"
              currentUrl={profile.kra_pin_image}
              identityId={identityId}
              onUploaded={(url) => setProfile((prev) => ({ ...prev, kra_pin_image: url }))}
            />
            <DocumentImageUpload
              label="CR12"
              fieldName="cr12_image"
              currentUrl={profile.cr12_image}
              identityId={identityId}
              onUploaded={(url) => setProfile((prev) => ({ ...prev, cr12_image: url }))}
            />
          </div>
        </div>
      </Section>

      {/* Professional Credentials */}
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
          <Field label="Valid Operating Licence Number">
            <input value={profile.valid_licence_number} onChange={(e) => set("valid_licence_number", e.target.value)} className={inputClass} placeholder="Valid licence number" />
          </Field>
          <DocumentImageUpload
            label="Valid Operating Licence"
            fieldName="valid_licence_image"
            currentUrl={profile.valid_licence_image}
            identityId={identityId}
            onUploaded={(url) => setProfile((prev) => ({ ...prev, valid_licence_image: url }))}
          />
        </div>

        {/* Extra credentials */}
        {profile.extra_credentials.length > 0 && (
          <div className="mt-5 space-y-3">
            {profile.extra_credentials.map((cred) => (
              <ExtraCredentialCard
                key={cred.id}
                credential={cred}
                identityId={identityId}
                onChange={updateExtraCredential}
                onRemove={() => removeExtraCredential(cred.id)}
              />
            ))}
          </div>
        )}
        <button
          onClick={addExtraCredential}
          className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <LucidePlus size={15} />
          Add another credential
        </button>
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
          <input value={languageInput} onChange={(e) => setLanguageInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLanguage()} placeholder="Add a language..." className={inputClass + " flex-1"} />
          <button onClick={addLanguage} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Add</button>
        </div>
      </Section>

      {/* Insurances */}
      <Section title="Insurances Accepted" icon={<LucideShield size={18} />}>
        <div className="flex flex-wrap gap-2 mb-4">
          {COMMON_INSURANCES.map((ins) => (
            <button
              key={ins}
              onClick={() => toggleInsurance(ins)}
              className={"text-xs px-3 py-1.5 rounded-full border font-medium transition-colors " + (profile.insurances_accepted.includes(ins) ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600")}
            >
              {ins}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={insuranceInput} onChange={(e) => setInsuranceInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomInsurance()} placeholder="Add other insurance..." className={inputClass + " flex-1"} />
          <button onClick={addCustomInsurance} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Add</button>
        </div>
        {profile.insurances_accepted.filter((i) => !COMMON_INSURANCES.includes(i)).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.insurances_accepted.filter((i) => !COMMON_INSURANCES.includes(i)).map((ins) => (
              <span key={ins} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full font-medium">
                {ins}
                <button onClick={() => toggleInsurance(ins)} className="ml-1 text-green-400 hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* No second Save button here — use the one in the header above */}
    </div>
  );
}
