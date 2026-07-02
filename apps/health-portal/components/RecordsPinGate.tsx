"use client";

import { useEffect, useState } from "react";
import { recordsPinApi } from "@veridoctor/api-client";
import { useRecordsUnlock } from "../app/useRecordsUnlock";

interface RecordsPinGateProps {
  children: React.ReactNode;
}

export default function RecordsPinGate({ children }: RecordsPinGateProps) {
  const { isUnlocked, unlock } = useRecordsUnlock();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isUnlocked) return;
    recordsPinApi
      .status()
      .then((res) => setHasPin(res.data.has_pin))
      .catch(() => setHasPin(false))
      .finally(() => setCheckingStatus(false));
  }, [isUnlocked]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLockedMessage(null);
    setLoading(true);
    try {
      const res = await recordsPinApi.verifyPin(pin);
      unlock(res.data.unlock_token, res.data.expires_in);
      setPin("");
    } catch (err: any) {
      if (err?.response?.status === 423) {
        setLockedMessage(err.response.data?.error || "Too many attempts. Try again later.");
      } else {
        const remaining = err?.response?.data?.remaining_attempts;
        setError(
          remaining !== undefined
            ? `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Incorrect PIN. Please try again."
        );
      }
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      await recordsPinApi.setPin(pin);
      const res = await recordsPinApi.verifyPin(pin);
      unlock(res.data.unlock_token, res.data.expires_in);
      setPin("");
      setConfirmPin("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not set PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSetup = hasPin === false;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">
          {isSetup ? "Protect your health records" : "Enter your records PIN"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isSetup
            ? "Set a PIN to keep your health records private, even from someone using your phone."
            : "For your privacy, we ask for your PIN before showing your health records."}
        </p>

        <form onSubmit={isSetup ? handleSetup : handleVerify} className="mt-4 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-xl tracking-widest focus:border-blue-500 focus:outline-none"
            placeholder="••••"
            disabled={!!lockedMessage}
          />

          {isSetup && (
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-xl tracking-widest focus:border-blue-500 focus:outline-none"
              placeholder="Confirm PIN"
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {lockedMessage && <p className="text-sm text-red-600">{lockedMessage}</p>}

          <button
            type="submit"
            disabled={loading || pin.length < 4 || !!lockedMessage}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Please wait…" : isSetup ? "Set PIN & continue" : "Unlock records"}
          </button>
        </form>
      </div>
    </div>
  );
}
