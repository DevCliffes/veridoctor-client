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
  const [statusError, setStatusError] = useState<string | null>(null);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isUnlocked) return;
    recordsPinApi
      .status()
      .then((res) => {
        if (res.status !== 200) {
          setStatusError(
            `Could not check PIN status (HTTP ${res.status}). Please try again shortly.`
          );
          return;
        }
        setHasPin(res.data.has_pin);
      })
      .catch(() => setStatusError("Could not reach the server. Please try again."))
      .finally(() => setCheckingStatus(false));
  }, [isUnlocked]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLockedMessage(null);
    setLoading(true);

    const res = await recordsPinApi.verifyPin(pin);

    if (res.status === 200) {
      unlock(res.data.unlock_token, res.data.expires_in);
      setPin("");
    } else if (res.status === 423) {
      setLockedMessage(res.data?.error || "Too many attempts. Try again later.");
      setPin("");
    } else {
      const remaining = res.data?.remaining_attempts;
      setError(
        remaining !== undefined
          ? `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
          : res.data?.error || `Something went wrong (HTTP ${res.status}). Please try again.`
      );
      setPin("");
    }
    setLoading(false);
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

    const setRes = await recordsPinApi.setPin(pin);
    if (setRes.status !== 201) {
      setError(setRes.data?.error || `Could not set PIN (HTTP ${setRes.status}).`);
      setLoading(false);
      return;
    }

    const verifyRes = await recordsPinApi.verifyPin(pin);
    if (verifyRes.status === 200) {
      unlock(verifyRes.data.unlock_token, verifyRes.data.expires_in);
      setPin("");
      setConfirmPin("");
    } else {
      setError(
        verifyRes.data?.error ||
          `PIN was set but could not unlock (HTTP ${verifyRes.status}). Try entering it again.`
      );
    }
    setLoading(false);
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

  if (statusError) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{statusError}</p>
        </div>
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
