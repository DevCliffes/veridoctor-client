"use client";
import { useEffect, useState } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useRouter } from "next/navigation";
import { LucideUser, LucideSearch, LucidePhone, LucideMail } from "@veridoctor/design/icons";

type Patient = {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_phone_number: string;
  appointment_type: string;
  status: string;
  start_time: string;
};

export default function Patients() {
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.identity);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!userId) return;
    axiosClient
      .get(`provider/${userId}/appointments?filter=all`)   // ← fetch all, not just upcoming
      .then((res) => {
        const all: Patient[] = res.data ?? [];

        // Sort newest first so we keep the most recent appointment per patient
        all.sort(
          (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );

        // Deduplicate by email — first occurrence is now the latest visit
        const seen = new Set();
        const unique = all.filter((p) => {
          const key = p.patient_email || `${p.patient_first_name}-${p.patient_last_name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setPatients(unique);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = patients.filter((p) => {
    const name = `${p.patient_first_name} ${p.patient_last_name}`.toLowerCase();
    const email = p.patient_email?.toLowerCase() ?? "";
    const phone = p.patient_phone_number ?? "";
    return (
      name.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase()) ||
      phone.includes(search)
    );
  });

  return (
    <div className="p-4 mx-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Patient Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {patients.length} unique patients
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-2">
        <LucideSearch size={16} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm outline-none text-gray-700 placeholder-gray-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <LucideUser size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">
              {search ? "No patients match your search." : "No patients yet."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Visit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {p.patient_first_name?.[0]}{p.patient_last_name?.[0]}
                      </div>
                      <p className="font-medium text-gray-800">
                        {p.patient_first_name} {p.patient_last_name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {p.patient_email && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <LucideMail size={12} />
                          <span className="text-xs">{p.patient_email}</span>
                        </div>
                      )}
                      {p.patient_phone_number && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <LucidePhone size={12} />
                          <span className="text-xs">{p.patient_phone_number}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(p.start_time).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.appointment_type === "virtual"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {p.appointment_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/patients/${p.id}`)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
