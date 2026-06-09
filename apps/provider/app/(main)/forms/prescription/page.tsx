"use client";
import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import { LucidePlus, LucideTrash2, LucidePrinter, LucideCheck } from "@veridoctor/design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { RootState } from "../../store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrugEntry {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Patient {
  id: string;
  name: string;
  date_of_birth?: string;
  phone?: string;
}

const FREQUENCIES = [
  "Once daily",
  "Twice daily (BD)",
  "Three times daily (TDS)",
  "Four times daily (QDS)",
  "Every 8 hours",
  "Every 6 hours",
  "At night (nocte)",
  "In the morning",
  "As needed (PRN)",
  "Once weekly",
];

const DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
  "2 months",
  "3 months",
  "6 months",
  "Ongoing",
];

const COMMON_DRUGS = [
  "Amoxicillin 500mg",
  "Metformin 500mg",
  "Amlodipine 5mg",
  "Atorvastatin 20mg",
  "Omeprazole 20mg",
  "Paracetamol 500mg",
  "Ibuprofen 400mg",
  "Metronidazole 400mg",
  "Ciprofloxacin 500mg",
  "Doxycycline 100mg",
  "Lisinopril 10mg",
  "Salbutamol Inhaler 100mcg",
];

const emptyDrug = (): DrugEntry => ({
  id: crypto.randomUUID(),
  name: "",
  dosage: "",
  frequency: "Once daily",
  duration: "7 days",
  instructions: "",
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrescriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient_id");
  const userId = useSelector((state: RootState) => state.auth.identity);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [drugs, setDrugs] = useState<DrugEntry[]>([emptyDrug()]);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [drugSuggestions, setDrugSuggestions] = useState<string[]>([]);
  const [activeDrugIdx, setActiveDrugIdx] = useState<number | null>(null);

  // Load patient if ID passed via query param
  useEffect(() => {
    if (!patientId || !userId) return;
    axiosClient
      .get(`provider/${userId}/patients/${patientId}`)
      .then((res) => setPatient(res.data))
      .catch(() => {});
  }, [patientId, userId]);

  // Patient search
  useEffect(() => {
    if (!patientSearch.trim() || patient) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(() => {
      axiosClient
        .get(`provider/${userId}/patients?search=${patientSearch}`)
        .then((res) => setPatientResults(res.data ?? []))
        .catch(() => setPatientResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, patient, userId]);

  // Drug name autocomplete
  const handleDrugNameChange = (idx: number, value: string) => {
    updateDrug(idx, "name", value);
    setActiveDrugIdx(idx);
    if (value.length >= 2) {
      setDrugSuggestions(
        COMMON_DRUGS.filter((d) =>
          d.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setDrugSuggestions([]);
    }
  };

  const updateDrug = (idx: number, field: keyof DrugEntry, value: string) => {
    setDrugs((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  const addDrug = () => setDrugs((prev) => [...prev, emptyDrug()]);

  const removeDrug = (idx: number) =>
    setDrugs((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!patient) {
      toast.error("Please select a patient");
      return;
    }
    if (drugs.some((d) => !d.name.trim())) {
      toast.error("Please fill in all drug names");
      return;
    }

    setSubmitting(true);
    try {
      await axiosClient.post(`provider/${userId}/prescriptions`, {
        patient_id: patient.id,
        diagnosis,
        notes,
        drugs: drugs.map(({ id, ...rest }) => rest),
      });
      setSubmitted(true);
      toast.success("Prescription saved successfully");
    } catch {
      toast.error("Failed to save prescription. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => window.print();

  // ─── Submitted state ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="p-4 mx-4 max-w-2xl">
        <div className="bg-white shadow-md rounded-lg p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <LucideCheck className="text-green-600 w-7 h-7" />
          </div>
          <p className="text-xl font-bold">Prescription saved</p>
          <p className="text-gray-500 text-sm">
            For <span className="font-medium">{patient?.name}</span>
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="roundedOutline" onClick={handlePrint}>
              <LucidePrinter className="w-4 h-4" /> Print
            </Button>
            <Button
              variant="roundedOutline"
              onClick={() => {
                setSubmitted(false);
                setDrugs([emptyDrug()]);
                setPatient(null);
                setDiagnosis("");
                setNotes("");
              }}
            >
              New prescription
            </Button>
            <Button onClick={() => router.push("/patients")}>
              Back to patients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className="p-4 mx-4 max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xl font-bold">Write prescription</p>
          <p className="text-gray-500 text-sm">
            Fill in patient details and medications below
          </p>
        </div>
        <Button variant="roundedOutline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {/* Patient selection */}
      <div className="bg-white shadow-md rounded-lg p-4 space-y-3">
        <p className="font-bold text-sm">Patient</p>

        {patient ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-sm">{patient.name}</p>
              {patient.date_of_birth && (
                <p className="text-xs text-gray-500">
                  DOB:{" "}
                  {new Date(patient.date_of_birth).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={() => setPatient(null)}
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="Search patient by name..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            {patientResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      setPatient(p);
                      setPatientSearch("");
                      setPatientResults([]);
                    }}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-medium">
                      {p.name.charAt(0)}
                    </div>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diagnosis */}
      <div className="bg-white shadow-md rounded-lg p-4 space-y-3">
        <p className="font-bold text-sm">Diagnosis / Indication</p>
        <input
          type="text"
          placeholder="e.g. Hypertension, Type 2 Diabetes, Upper respiratory tract infection..."
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Medications */}
      <div className="bg-white shadow-md rounded-lg p-4 space-y-4">
        <div className="flex justify-between items-center">
          <p className="font-bold text-sm">Medications</p>
          <button
            onClick={addDrug}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
          >
            <LucidePlus className="w-3 h-3" /> Add medication
          </button>
        </div>

        {drugs.map((drug, idx) => (
          <div
            key={drug.id}
            className="border border-gray-200 rounded-lg p-3 space-y-3 relative"
          >
            {/* Drug number */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-400">
                Medication {idx + 1}
              </span>
              {drugs.length > 1 && (
                <button
                  onClick={() => removeDrug(idx)}
                  className="text-red-400 hover:text-red-600"
                >
                  <LucideTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Drug name with autocomplete */}
            <div className="relative">
              <label className="text-xs text-gray-500 mb-1 block">
                Drug name & strength
              </label>
              <input
                type="text"
                placeholder="e.g. Amoxicillin 500mg"
                value={drug.name}
                onChange={(e) => handleDrugNameChange(idx, e.target.value)}
                onBlur={() =>
                  setTimeout(() => {
                    setDrugSuggestions([]);
                    setActiveDrugIdx(null);
                  }, 150)
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              {activeDrugIdx === idx && drugSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {drugSuggestions.map((s) => (
                    <button
                      key={s}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                      onMouseDown={() => {
                        updateDrug(idx, "name", s);
                        setDrugSuggestions([]);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Frequency */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Frequency
                </label>
                <select
                  value={drug.frequency}
                  onChange={(e) => updateDrug(idx, "frequency", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Duration
                </label>
                <select
                  value={drug.duration}
                  onChange={(e) => updateDrug(idx, "duration", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  {DURATIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Special instructions */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Special instructions (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Take with food, avoid alcohol..."
                value={drug.instructions}
                onChange={(e) =>
                  updateDrug(idx, "instructions", e.target.value)
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="bg-white shadow-md rounded-lg p-4 space-y-3">
        <p className="font-bold text-sm">Additional notes</p>
        <textarea
          placeholder="Follow-up instructions, referrals, lifestyle advice..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pb-8">
        <Button
          variant="roundedOutline"
          onClick={handlePrint}
          className="flex-shrink-0"
        >
          <LucidePrinter className="w-4 h-4" /> Preview & print
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? "Saving..." : "Save prescription"}
        </Button>
      </div>
    </div>
  );
}
