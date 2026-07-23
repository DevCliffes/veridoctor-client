"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { axiosClient } from "@veridoctor/api-client";

// BACKEND DEPENDENCY 1 (unchanged from before):
//   GET /provider/{identityId}/appointments/incomplete-notes
// Appointments that happened but whose capture form was never submitted.
//   { id: string; patient_name: string; appointment_date: string }[]
//
// BACKEND DEPENDENCY 2 (new):
//   GET /provider/{identityId}/appointments/with-messages
// Upcoming (not yet completed) appointments that carry a non-empty
// booking message -- the same "message (optional)" field captured in the
// booking / new-appointment modals. No read/unread tracking needed: an
// item simply stops appearing once its appointment_date has passed (at
// which point, if notes are still missing, it'll show up in the
// incomplete-notes list instead).
//   { id: string; patient_name: string; appointment_date: string; message: string }[]
interface IncompleteNoteAppointment {
  id: string;
  patient_name: string;
  appointment_date: string;
}

interface MessagedAppointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  message: string;
}

type PendingItem =
  | { kind: "incomplete_note"; id: string; patientName: string; date: string }
  | { kind: "booking_message"; id: string; patientName: string; date: string; message: string };

interface PendingActionsProps {
  identityId: string;
}

function daysAgo(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
}

function formatUpcoming(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today · ${time}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` · ${time}`;
}

export function PendingActions({ identityId }: PendingActionsProps) {
  const router = useRouter();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!identityId) return;
    setLoading(true);

    Promise.all([
      axiosClient
        .get<IncompleteNoteAppointment[]>(`/provider/${identityId}/appointments/incomplete-notes`)
        .then((res) => res.data ?? [])
        .catch(() => [] as IncompleteNoteAppointment[]),
      axiosClient
        .get<MessagedAppointment[]>(`/provider/${identityId}/appointments/with-messages`)
        .then((res) => res.data ?? [])
        .catch(() => [] as MessagedAppointment[]),
    ]).then(([incomplete, messaged]) => {
      const incompleteItems: PendingItem[] = incomplete.map((a) => ({
        kind: "incomplete_note",
        id: a.id,
        patientName: a.patient_name,
        date: a.appointment_date,
      }));
      const messagedItems: PendingItem[] = messaged.map((a) => ({
        kind: "booking_message",
        id: a.id,
        patientName: a.patient_name,
        date: a.appointment_date,
        message: a.message,
      }));
      // Overdue notes first (most urgent, oldest first), then upcoming
      // messaged appointments soonest-first.
      incompleteItems.sort((a, b) => daysAgo(b.date) - daysAgo(a.date));
      messagedItems.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      setItems([...incompleteItems, ...messagedItems]);
      setLoading(false);
    });
  }, [identityId]);

  if (loading) {
    return (
      <div className="bg-card shadow-md rounded-lg p-4 border border-border animate-pulse">
        <p className="font-bold text-foreground mb-3">Pending actions</p>
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-card shadow-md rounded-lg p-4 border border-border">
        <p className="font-bold text-foreground mb-3">Pending actions</p>
        <p className="text-sm text-muted-foreground">
          All caught up — nothing waiting on you right now.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card shadow-md rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-foreground">Pending actions</p>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => {
          if (item.kind === "incomplete_note") {
            const overdue = daysAgo(item.date);
            const urgent = overdue >= 2;
            return (
              <button
                key={`note-${item.id}`}
                onClick={() => router.push(`/appointments/${item.id}`)}
                className="w-full flex items-start gap-3 py-3 first:pt-0 last:pb-0 hover:bg-accent -mx-1 px-1 rounded transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0">
                  📝
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.patientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notes not completed ·{" "}
                    {overdue === 0 ? "today" : `${overdue}d ago`}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${
                    urgent
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {urgent ? "Urgent" : "Pending"}
                </span>
              </button>
            );
          }

          return (
            <button
              key={`msg-${item.id}`}
              onClick={() => router.push(`/appointments/${item.id}`)}
              className="w-full flex items-start gap-3 py-3 first:pt-0 last:pb-0 hover:bg-accent -mx-1 px-1 rounded transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.patientName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  "{item.message}"
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 bg-blue-100 text-blue-800 whitespace-nowrap">
                {formatUpcoming(item.date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
