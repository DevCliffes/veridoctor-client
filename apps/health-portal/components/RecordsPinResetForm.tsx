"use client";

import { useState } from "react";
import { recordsPinApi } from "@veridoctor/api-client";

export default function RecordsPinResetForm() {
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
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
    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);
    const res = await recordsPinApi.resetPin(password, newPin);

    if (res.status === 200) {
      setSuccess(true);
      setPassword("");
      setNewPin("");
      setConfirmPin("");
    } else {
      setError(res.data?.error || `Could not reset PIN (HTTP ${res.status}).`);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <p className="text-sm text-gray-500">
        Forgot your records PIN, or never finished setting one up? Enter your
        account password to set a new PIN.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700">Account password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
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
          placeholder="••••"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Confirm new PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2 tracking-widest focus:border-blue-500 focus:outline-none"
          placeholder="••••"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">PIN reset successfully. Try accessing your records again.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
      >
        {loading ? "Resetting…" : "Reset PIN"}
      </button>
    </form>
  );
}
