"use client";
import { axiosClient } from "@veridoctor/api-client";
import { Button } from "@veridoctor/design/components";
import { LucidePlus, LucideTrash2, LucidePrinter, LucideCheck } from "@veridoctor/design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { RootState } from "../../../store";

interface DrugEntry {
  id: string;
  drug_name: string;  // ← was "name", now matches backend field exactly
  dosage: string;     // ← was missing from UI
  frequency: string;
  duration: string;
  instructions: string;
}

interface Patient {
  id: string;
  name: string;
  patient_identity: string | null;
  patient_email: string;
  patient_phone_number: string;
}

interface RawAppointment {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
  patient_identity: string | null;
  start_time: string;
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
  "Amoxicillin",
  "Metformin",
  "Amlodipine",
  "Atorvastatin",
  "Omeprazole",
  "Paracetamol",
  "Ibuprofen",
  "Metronidazole",
  "Ciprofloxacin",
  "Doxycycline",
  "Lisinopril",
  "Salbutamol",
];

const emptyDrug = (): DrugEntry => ({
  id: crypto.randomUUID(),
  drug_name: "",
  dosage: "",
  frequency: "Once daily",
  duration: "7 days",
  instructions: "",
});

export default function PrescriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient_id");
  const userId = useSelector((state: RootState) => state.auth.identity);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [drugs, setDrugs] = useState<DrugEntry[]>([emptyDrug()]);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [drugSuggestions, setDrugSuggestions] = useState<string[]>([]);
  const [activeDrugIdx, setActiveDrugIdx] = useState<number | null>(null);

  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(`provider/${userId}/appointments?filter=all`)
      .then((res) => {
        const all: RawAppointment[] = res.data ?? [];
        all.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        const seen = new Set<string>();
        const unique: Patient[] = [];
        for (const a of all) {
          const key = a.patient_email || `${a.patient_first_name}-${a.patient_last_name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push({
            id: a.patient_identity || a.id,
            name: `${a.patient_first_name} ${a.patient_last_name}`.trim(),
            patient_identity: a.patient_identity,
            patient_email: a.patient_email,
            patient_phone_number: a.patient_phone_number,
          });
        }
        setAllPatients(unique);
      })
      .catch(() => {})
      .finally(() => setPatientsLoaded(true));
  }, [userId]);

  useEffect(() => {
    if (!patientId || !patientsLoaded) return;
    const match = allPatients.find(
      (p) => p.id === patientId || p.patient_identity === patientId
    );
    if (match) setPatient(match);
  }, [patientId, patientsLoaded, allPatients]);

  const patientResults =
    !patient && patientSearch.trim()
      ? allPatients.filter((p) =>
          p.name.toLowerCase().includes(patientSearch.toLowerCase())
        )
      : [];

  const updateDrug = (idx: number, field: keyof DrugEntry, value: string) => {
    setDrugs((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  const handleDrugNameChange = (idx: number, value: string) => {
    updateDrug(idx, "drug_name", value);  // ← key fix: field is drug_name
    setActiveDrugIdx(idx);
    if (value.length >= 2) {
      setDrugSuggestions(
        COMMON_DRUGS.filter((d) => d.toLowerCase().includes(value.toLowerCase()))
      );
    } else {
      setDrugSuggestions([]);
    }
  };

  const addDrug = () => setDrugs((prev) => [...prev, emptyDrug()]);
  const removeDrug = (idx: number) => setDrugs((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (hasSubmitted.current || submitting) return;
    if (!patient) { toast.error("Please select a patient"); return; }
    if (drugs.some((d) => !d.drug_name.trim())) {
      toast.error("Please fill in all drug names");
      return;
    }

    hasSubmitted.current = true;
    setSubmitting(true);

    try {
      await axiosClient.post(`provider/${userId}/prescriptions`, {
        patient_id: patient.id,
        patient_name: patient.name,
        patient_email: patient.patient_email,
        diagnosis,
        notes,
        // Send exactly what the backend PrescriptionDrugSerializer expects
        drugs: drugs.map(({ id, ...rest }) => rest),
        // rest now contains: drug_name, dosage, frequency, duration, instructions
      });
      toast.success("Prescription saved");
      router.push("/prescriptions");
    } catch {
      toast.error("Failed to save prescription. Please try again.");
      hasSubmitted.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 mx-4 max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xl font-bold">Write prescription</p>
          <p className="text-gray-500 text-sm">Fill in patient details and medications below</p>
        </div>
        <Button variant="roundedOutline" onClick={() => router.back()}>Cancel</Button>
      </div>

      {/* Patient */}
      <div className="bg-white shadow-md rounded-lg p-4 space-y-3">
        <p className="font-bold text-sm">Patient</p>
        {patient ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-sm">{patient.name}</p>
              {patient.patient_email && (
                <p className="text-xs text-gray-500">{patient.patient_email}</p>
              )}
            </div>
            <button className="text-xs text-red-500 hover:underline" onClick={() => setPatient(null)}>
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder={patientsLoaded ? "Search patient by name..." : "Loading patients..."}
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              disabled={!patientsLoaded}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-50"
            />
            {patientResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {patientResults.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => { setPatient(p); setPatientSearch(""); }}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-medium">
                      {p.name.charAt(0)}
                    </div>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            {patientsLoaded && patientSearch.trim() && patientResults.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No patients match &quot;{patientSearch}&quot;.</p>
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
          <div key={drug.id} className="border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-400">Medication {idx + 1}</span>
              {drugs.length > 1 && (
                <button onClick={() => removeDrug(idx)} className="text-red-400 hover:text-red-600">
                  <LucideTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Drug name */}
            <div className="relative">
              <label className="text-xs text-gray-500 mb-1 block">Drug name</label>
              <input
                type="text"
                placeholder="e.g. Amoxicillin, Paracetamol..."
                value={drug.drug_name}
                onChange={(e) => handleDrugNameChange(idx, e.target.value)}
                onBlur={() => setTimeout(() => { setDrugSuggestions([]); setActiveDrugIdx(null); }, 150)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              {activeDrugIdx === idx && drugSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {drugSuggestions.map((s) => (
                    <button
                      key={s}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                      onMouseDown={() => { updateDrug(idx, "drug_name", s); setDrugSuggestions([]); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dosage — was missing, now present */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dosage</label>
              <input
                type="text"
                placeholder="e.g. 500mg, 1 tablet, 10ml"
                value={drug.dosage}
                onChange={(e) => updateDrug(idx, "dosage", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            {/* Frequency + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                <select
                  value={drug.frequency}
                  onChange={(e) => updateDrug(idx, "frequency", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Duration</label>
                <select
                  value={drug.duration}
                  onChange={(e) => updateDrug(idx, "duration", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  {DURATIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Special instructions */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Special instructions (optional)</label>
              <input
                type="text"
                placeholder="e.g. Take with food, avoid alcohol..."
                value={drug.instructions}
                onChange={(e) => updateDrug(idx, "instructions", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Additional notes */}
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

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="roundedOutline" onClick={() => window.print()} className="flex-shrink-0">
          <LucidePrinter className="w-4 h-4" /> Preview & print
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
          {submitting ? (
            <span className="flex items-center gap-2 justify-center">
              <LucideCheck className="w-4 h-4 animate-pulse" /> Saving...
            </span>
          ) : (
            "Save prescription"
          )}
        </Button>
      </div>
    </div>
  );
}

