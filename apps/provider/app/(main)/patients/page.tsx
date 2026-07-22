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
