"use client";

import { useState } from "react";
import { recordsPinApi } from "@veridoctor/api-client";

export default function RecordsPinChangeForm() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPin.length < 4) {
      setError("New PIN must be at least 4 digits.");
      return;
    }

    setLoading(true);
    try {
      await recordsPinApi.changePin(currentPin, newPin);
      setSuccess(true);
      setCurrentPin("");
      setNewPin("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not change PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700">Current PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 tracking-widest focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">New PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 tracking-widest focus:border-blue-500 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">PIN updated successfully.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
      >
        {loading ? "Saving…" : "Change PIN"}
      </button>
    </form>
  );
}
