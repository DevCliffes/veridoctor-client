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
    setLoading(true);

    // Needs every appointment ever, across all pages, to correctly dedupe
    // patients -- a single-page fetch would silently undercount any
    // provider with more history than one page holds. Loops on `next`
    // (a full URL from DRF's paginator) until exhausted.
    const fetchAllAppointments = async (): Promise<Patient[]> => {
      let url: string | null = `provider/${userId}/appointments?filter=all&page_size=100`;
      let results: Patient[] = [];
      while (url) {
        const res = await axiosClient.get(url);
        results = results.concat(res.data?.results ?? []);
        url = res.data?.next ?? null;
      }
      return results;
    };

    fetchAllAppointments()
      .then((all) => {
        all.sort(
          (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        const seen = new Set();
        const unique = all.filter((p) => {
          const key = p.patient_email || `${p.patient_first_name}-${p.patient_last_name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setPatients(unique);
      })
      .catch((err) => {
        console.error("Failed to load patients", err);
      })
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
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Patient Records</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {patients.length} unique patients
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-3 flex items-center gap-2">
        <LucideSearch size={16} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm outline-none bg-transparent text-foreground placeholder-muted-foreground"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <LucideUser size={32} className="mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">
              {search ? "No patients match your search." : "No patients yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Last Visit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-accent transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {p.patient_first_name?.[0]}{p.patient_last_name?.[0]}
                        </div>
                        <p className="font-medium text-foreground whitespace-nowrap">
                          {p.patient_first_name} {p.patient_last_name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {p.patient_email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <LucideMail size={12} />
                            <span className="text-xs whitespace-nowrap">{p.patient_email}</span>
                          </div>
                        )}
                        {p.patient_phone_number && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <LucidePhone size={12} />
                            <span className="text-xs whitespace-nowrap">{p.patient_phone_number}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(p.start_time).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
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
                        className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
