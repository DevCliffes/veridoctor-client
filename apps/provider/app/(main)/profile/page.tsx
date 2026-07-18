"use client";
import { useEffect, useState, useRef, useCallback } from "react";
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
  LucideUpload,
  LucideFileText,
  LucidePlus,
  LucideTrash2,
  LucideBuilding,
  LucideZoomIn,
  LucideZoomOut,
  LucideX,
  LucideAlertTriangle,
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

interface DocumentReview {
  field_name: string;
  field_label: string;
  status: "pending" | "approved" | "rejected";
  status_label: string;
  document_url: string;
  rejection_category: string;
  rejection_category_label: string;
  rejection_reason: string;
  reviewed_at: string | null;
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
// Card crop ratio: 4:3 width:height
const CROP_ASPECT_W = 4;
const CROP_ASPECT_H = 3;

// Mirrors HealthcareProvider.REQUIRED_TEXT_FIELDS / REQUIRED_IMAGE_FIELDS
// on the backend (provider/models.py) so the "Submit for Review" button
// can be disabled client-side the moment the profile looks complete,
// without waiting for a round trip. The backend re-checks the same list
// on submit regardless -- see ProviderProfileView.patch -- this copy is
// purely for responsive UX, not the actual gate.
const REQUIRED_TEXT_FIELDS: (keyof ProviderProfile)[] = [
  "phone_number", "licence_number", "licence_type", "speciality", "clinic_name",
  "address", "county", "country", "bio", "national_id_number",
  "business_reg_number", "operating_licence", "kra_pin", "valid_licence_number",
];
const REQUIRED_IMAGE_FIELDS: (keyof ProviderProfile)[] = [
  "profile_picture_url", "national_id_image", "clinic_logo_url",
  "business_reg_image", "operating_licence_image", "kra_pin_image",
  "cr12_image", "valid_licence_image",
];

const FIELD_LABELS: Record<string, string> = {
  phone_number: "Phone number",
  licence_number: "Licence number",
  licence_type: "Licence type",
  speciality: "Speciality",
  clinic_name: "Clinic name",
  address: "Address",
  county: "County",
  country: "Country",
  bio: "Bio / About",
  national_id_number: "National ID / Passport number",
  business_reg_number: "Business registration number",
  operating_licence: "Operating licence number",
  kra_pin: "KRA PIN",
  valid_licence_number: "Valid operating licence number",
  profile_picture_url: "Profile photo",
  national_id_image: "National ID / Passport image",
  clinic_logo_url: "Clinic logo",
  business_reg_image: "Business registration certificate",
  operating_licence_image: "Operating licence image",
  kra_pin_image: "KRA PIN certificate",
  cr12_image: "CR12",
  valid_licence_image: "Valid operating licence image",
  first_name: "First name",
  last_name: "Last name",
};

function computeMissingFields(profile: ProviderProfile): string[] {
  const missing: string[] = [];
  [...REQUIRED_TEXT_FIELDS, ...REQUIRED_IMAGE_FIELDS].forEach((field) => {
    const value = profile[field] as unknown;
    if (!value || (typeof value === "string" && value.trim() === "")) {
      missing.push(field as string);
    }
  });
  if (!profile.first_name?.trim()) missing.push("first_name");
  if (!profile.last_name?.trim()) missing.push("last_name");
  return missing;
}

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
    <div className={"fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 max-w-md " + (type === "success" ? "bg-green-600" : "bg-red-600")}>
      {type === "success" ? <LucideCheck size={16} className="shrink-0" /> : <LucideAlertTriangle size={16} className="shrink-0" />}
      <span>{message}</span>
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

// ─────────────────────────────────────────────────────────────────
// Document review status badge
// Shown underneath each document upload control so a doctor can see
// at a glance whether it's pending, approved, or rejected -- and if
// rejected, exactly why, so they know what to fix before re-uploading.
// ─────────────────────────────────────────────────────────────────
function DocumentReviewBadge({ review }: { review?: DocumentReview }) {
  if (!review) return null;

  if (review.status === "approved") {
    return (
      <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
        <LucideCheck size={12} /> Approved
      </p>
    );
  }

  if (review.status === "rejected") {
    return (
      <div className="mt-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2">
        <p className="font-semibold flex items-center gap-1">
          <LucideAlertTriangle size={12} />
          Rejected{review.rejection_category_label ? " — " + review.rejection_category_label : ""}
        </p>
        {review.rejection_reason && (
          <p className="text-red-500 mt-1">{review.rejection_reason}</p>
        )}
        <p className="text-red-400 mt-1">Please re-upload a corrected document above.</p>
      </div>
    );
  }

  return (
    <p className="text-xs text-amber-600 font-medium mt-1.5">Pending review</p>
  );
}

// ─────────────────────────────────────────────────────────────────
// Photo crop modal
// The user drags and zooms their image inside a 4:3 viewport.
// When satisfied, we render it onto a canvas and export as a blob.
// ─────────────────────────────────────────────────────────────────
interface CropState {
  x: number;   // offset of image top-left within viewport (px)
  y: number;
  scale: number;
}

function PhotoCropModal({
  src,
  onCancel,
  onConfirm,
}: {
  src: string;           // object URL of the selected file
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const VIEWPORT_W = 480;
  const VIEWPORT_H = Math.round(VIEWPORT_W * CROP_ASPECT_H / CROP_ASPECT_W); // 360

  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, scale: 1 });
  const [imgNaturalW, setImgNaturalW] = useState(1);
  const [imgNaturalH, setImgNaturalH] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; cx: number; cy: number } | null>(null);

  // On image load: fit image to fill the viewport, centred
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setImgNaturalW(img.naturalWidth);
    setImgNaturalH(img.naturalHeight);
    // Scale so the image fills the viewport in at least one dimension
    const scaleW = VIEWPORT_W / img.naturalWidth;
    const scaleH = VIEWPORT_H / img.naturalHeight;
    const scale = Math.max(scaleW, scaleH);
    const dispW = img.naturalWidth * scale;
    const dispH = img.naturalHeight * scale;
    setCrop({
      scale,
      x: (VIEWPORT_W - dispW) / 2,
      y: (VIEWPORT_H - dispH) / 2,
    });
  };

  const clampCrop = useCallback((next: CropState): CropState => {
    const dispW = imgNaturalW * next.scale;
    const dispH = imgNaturalH * next.scale;
    // Image must cover the full viewport — no gaps at edges
    const minX = Math.min(0, VIEWPORT_W - dispW);
    const maxX = 0;
    const minY = Math.min(0, VIEWPORT_H - dispH);
    const maxY = 0;
    return {
      ...next,
      x: Math.min(maxX, Math.max(minX, next.x)),
      y: Math.min(maxY, Math.max(minY, next.y)),
    };
  }, [imgNaturalW, imgNaturalH, VIEWPORT_W, VIEWPORT_H]);

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, cx: crop.x, cy: crop.y };
  };
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setCrop((prev) => clampCrop({ ...prev, x: dragStart.current!.cx + dx, y: dragStart.current!.cy + dy }));
  }, [dragging, clampCrop]);
  const onMouseUp = useCallback(() => setDragging(false), []);

  // Touch drag
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { mx: t.clientX, my: t.clientY, cx: crop.x, cy: crop.y };
  };
  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging || !dragStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.mx;
    const dy = t.clientY - dragStart.current.my;
    setCrop((prev) => clampCrop({ ...prev, x: dragStart.current!.cx + dx, y: dragStart.current!.cy + dy }));
  }, [dragging, clampCrop]);
  const onTouchEnd = useCallback(() => setDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  const zoom = (delta: number) => {
    setCrop((prev) => {
      const minScale = Math.max(
        VIEWPORT_W / imgNaturalW,
        VIEWPORT_H / imgNaturalH
      );
      const newScale = Math.min(5, Math.max(minScale, prev.scale + delta));
      // Zoom toward centre of viewport
      const cx = VIEWPORT_W / 2;
      const cy = VIEWPORT_H / 2;
      const ratio = newScale / prev.scale;
      const newX = cx - ratio * (cx - prev.x);
      const newY = cy - ratio * (cy - prev.y);
      return clampCrop({ scale: newScale, x: newX, y: newY });
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.08 : -0.08);
  };

  // Export: draw current view onto a canvas at a fixed output size
  const OUTPUT_W = 800;
  const OUTPUT_H = Math.round(OUTPUT_W * CROP_ASPECT_H / CROP_ASPECT_W); // 600

  const handleConfirm = () => {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx || !imgRef.current) return;

    // Map viewport coordinates back to image source coordinates
    const scaleRatio = OUTPUT_W / VIEWPORT_W;
    const destW = imgNaturalW * crop.scale * scaleRatio;
    const destH = imgNaturalH * crop.scale * scaleRatio;
    const destX = crop.x * scaleRatio;
    const destY = crop.y * scaleRatio;

    ctx.drawImage(imgRef.current, destX, destY, destW, destH);
    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/jpeg", 0.92);
  };

  const dispW = imgNaturalW * crop.scale;
  const dispH = imgNaturalH * crop.scale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-800">Position your photo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Drag to reposition · Scroll or use buttons to zoom</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <LucideX size={18} />
          </button>
        </div>

        {/* Crop viewport */}
        <div className="flex flex-col items-center gap-4 p-5">
          {/* Label */}
          <p className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-lg w-full text-center">
            This is exactly how your photo will appear to patients
          </p>

          {/* The 4:3 viewport */}
          <div
            className="relative overflow-hidden rounded-xl border-2 border-blue-200 cursor-grab active:cursor-grabbing select-none"
            style={{ width: VIEWPORT_W, height: VIEWPORT_H, maxWidth: "100%" }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onWheel={handleWheel}
          >
            {/* Hidden image used for load event and canvas drawImage */}
            <img
              ref={imgRef}
              src={src}
              alt="Crop source"
              crossOrigin="anonymous"
              onLoad={handleImgLoad}
              className="hidden"
            />
            {/* Visible positioned image */}
            <div
              style={{
                position: "absolute",
                left: crop.x,
                top: crop.y,
                width: dispW,
                height: dispH,
                backgroundImage: `url(${src})`,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
              }}
            />
            {/* Rule-of-thirds grid overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "33.33% 33.33%",
            }} />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => zoom(-0.1)}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <LucideZoomOut size={16} className="text-gray-600" />
            </button>
            <input
              type="range"
              min={50}
              max={300}
              step={1}
              value={Math.round(crop.scale * 100)}
              onChange={(e) => {
                const newScale = Number(e.target.value) / 100;
                setCrop((prev) => {
                  const cx = VIEWPORT_W / 2;
                  const cy = VIEWPORT_H / 2;
                  const ratio = newScale / prev.scale;
                  const newX = cx - ratio * (cx - prev.x);
                  const newY = cy - ratio * (cy - prev.y);
                  return clampCrop({ scale: newScale, x: newX, y: newY });
                });
              }}
              className="w-40 accent-blue-600"
            />
            <button
              onClick={() => zoom(0.1)}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <LucideZoomIn size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Use this crop
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentImageUpload({
  label, fieldName, currentUrl, identityId, onUploaded, review,
}: {
  label: string; fieldName: string; currentUrl: string; identityId: string; onUploaded: (url: string) => void;
  review?: DocumentReview;
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
      <DocumentReviewBadge review={review} />
    </div>
  );
}

function LogoUpload({ currentUrl, identityId, onUploaded, review }: {
  currentUrl: string; identityId: string; onUploaded: (url: string) => void;
  review?: DocumentReview;
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
    <div className="flex flex-col items-center gap-1">
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
      <div className="w-full"><DocumentReviewBadge review={review} /></div>
    </div>
  );
}

function ExtraCredentialCard({ credential, identityId, onChange, onRemove }: {
  credential: ExtraCredential; identityId: string;
  onChange: (updated: ExtraCredential) => void; onRemove: () => void;
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
          <input value={credential.name} onChange={(e) => onChange({ ...credential, name: e.target.value })} placeholder="e.g. KMPDB Registration" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Number / Reference</label>
          <input value={credential.number} onChange={(e) => onChange({ ...credential, number: e.target.value })} placeholder="e.g. KMPDB/12345" className={inputClass} />
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
  const [documentReviews, setDocumentReviews] = useState<Record<string, DocumentReview>>({});

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null); // object URL of selected file
  const pendingFileRef = useRef<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!identityId) { setLoading(false); return; }
    axiosClient
      .get("/provider/" + identityId + "/profile")
      .then((res) =>
        setProfile((prev) => ({
          ...prev,
          ...res.data,
          subspecialties: res.data.subspecialties ?? [],
        }))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [identityId]);

  // Fetches the per-document review status (pending/approved/rejected +
  // rejection reason) so it can be shown right next to each upload
  // control below, instead of the doctor only seeing a generic
  // "documents under review" banner with no way to tell which document
  // is the problem.
  useEffect(() => {
    if (!identityId) return;
    axiosClient
      .get("/provider/" + identityId + "/document-reviews")
      .then((res) => {
        const map: Record<string, DocumentReview> = {};
        (res.data || []).forEach((r: DocumentReview) => {
          map[r.field_name] = r;
        });
        setDocumentReviews(map);
      })
      .catch(() => {});
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

  // Step 1: file selected → open crop modal
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ message: "Please select an image file.", type: "error" });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setToast({ message: "Image too large. Max 5MB.", type: "error" });
      return;
    }
    pendingFileRef.current = file;
    setCropSrc(URL.createObjectURL(file));
  };

  // Step 2: user confirms crop → receive canvas blob → upload
  const handleCropConfirm = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    // Show local preview immediately while uploading
    const localUrl = URL.createObjectURL(blob);
    setProfile((prev) => ({ ...prev, profile_picture_url: localUrl }));
    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("photo", blob, "photo.jpg");
      const res = await axiosClient.post(
        "/provider/" + identityId + "/photo",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const uploadedUrl = res.data?.profile_picture_url;
      if (uploadedUrl) {
        setProfile((prev) => ({ ...prev, profile_picture_url: uploadedUrl }));
        setToast({ message: "Profile photo updated!", type: "success" });
      }
    } catch {
      setProfile((prev) => ({
        ...prev,
        profile_picture_url: prev.profile_picture_url === localUrl ? "" : prev.profile_picture_url,
      }));
      setToast({ message: "Failed to upload photo.", type: "error" });
    } finally {
      URL.revokeObjectURL(localUrl);
      setUploadingPhoto(false);
      pendingFileRef.current = null;
    }
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    pendingFileRef.current = null;
  };

  // Recomputed on every render from current form state -- cheap, and
  // means the Submit button's disabled state updates live as the doctor
  // fills things in, rather than only after a save round trip.
  const missingFields = computeMissingFields(profile);
  const canSubmit = missingFields.length === 0;

  const handleSave = async () => {
    if (!identityId) return;
    setSaving(true);
    try {
      const res = await axiosClient.patch("/provider/" + identityId + "/profile", {
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
        submit: true,
      });
      if (res.data?.submitted) {
        setToast({ message: "Profile submitted for review!", type: "success" });
      } else {
        setToast({ message: "Profile updated successfully!", type: "success" });
      }
    } catch (err: any) {
      const labels: string[] | undefined = err?.response?.data?.missing_field_labels;
      if (labels && labels.length) {
        setToast({ message: "Missing before you can submit: " + labels.join(", "), type: "error" });
      } else {
        setToast({ message: "Failed to save profile.", type: "error" });
      }
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

      {/* Crop modal — rendered over everything when a file is selected */}
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}

      {/* Incomplete-profile notice — tells the doctor exactly what's
          missing before they even try to submit, rather than only
          finding out after a rejected submit attempt. */}
      {!canSubmit && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-2xl p-4 flex items-start gap-2">
          <LucideAlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Your profile isn't ready to submit yet.</p>
            <p className="mt-1">
              Missing: {missingFields.map((f) => FIELD_LABELS[f] || f).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
        </div>
        <div>
          <h1 className="text-xl font-bold">{profile.title} {profile.first_name} {profile.last_name}</h1>
          <p className="text-blue-100 text-sm mt-0.5">{profile.speciality || "Healthcare Provider"}</p>
          {profile.clinic_name && <p className="text-blue-200 text-xs mt-0.5">{profile.clinic_name}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !canSubmit}
          title={!canSubmit ? "Missing: " + missingFields.map((f) => FIELD_LABELS[f] || f).join(", ") : undefined}
          className="ml-auto flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <LucideLoader2 size={14} className="animate-spin" /> : <LucideCheck size={14} />}
          {saving ? "Submitting..." : "Submit for Review"}
        </button>
      </div>

      {/* Personal Information */}
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

        <div className="mt-4">
          <Field label="Subspecialties">
            <div className="flex gap-2">
              <input
                value={subspecialtyInput}
                onChange={(e) => setSubspecialtyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubspecialty())}
                placeholder="e.g. Pediatric Cardiology, Sports Medicine..."
                className={inputClass + " flex-1"}
              />
              <button type="button" onClick={addSubspecialty} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shrink-0">Add</button>
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
            Add specific areas of focus within your speciality — these appear on your public profile so patients can find you more easily.
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
            review={documentReviews["national_id_image"]}
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
            review={documentReviews["clinic_logo_url"]}
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
              review={documentReviews["business_reg_image"]}
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
              review={documentReviews["operating_licence_image"]}
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
              review={documentReviews["kra_pin_image"]}
            />
            <DocumentImageUpload
              label="CR12"
              fieldName="cr12_image"
              currentUrl={profile.cr12_image}
              identityId={identityId}
              onUploaded={(url) => setProfile((prev) => ({ ...prev, cr12_image: url }))}
              review={documentReviews["cr12_image"]}
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
            review={documentReviews["valid_licence_image"]}
          />
        </div>
        {profile.extra_credentials.length > 0 && (
          <div className="mt-5 space-y-3">
            {profile.extra_credentials.map((cred) => (
              <ExtraCredentialCard key={cred.id} credential={cred} identityId={identityId} onChange={updateExtraCredential} onRemove={() => removeExtraCredential(cred.id)} />
            ))}
          </div>
        )}
        <button onClick={addExtraCredential} className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
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
    </div>
  );
}
