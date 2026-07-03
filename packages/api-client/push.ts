import { axiosClient } from "./axios-client";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(identityId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
    return false;
  }
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  await axiosClient.post("/notifications/push-subscribe/", {
    identity_id: identityId,
    subscription: subscription.toJSON(),
  });
  return true;
}

export function getPushPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

// Reuse a single AudioContext across calls instead of creating a new one
// every time. Browsers only let a context leave the "suspended" state
// after a genuine user gesture (click/tap/keypress) — once *this*
// context has been resumed following any such gesture anywhere on the
// page, it stays usable for every future chime, poll-driven or not.
let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

export function playNotificationChime(): void {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const play = () => {
      const now = ctx.currentTime;
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.15, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration);
      };
      playTone(880, 0, 0.15);
      playTone(1175, 0.12, 0.2);
    };

    // If the context is suspended (no user gesture has unlocked it yet),
    // resume() will only succeed once a gesture has occurred somewhere on
    // the page. If it's still suspended even after attempting resume,
    // the tone is silently skipped rather than thrown against dead audio.
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        if (ctx.state === "running") play();
      });
    } else {
      play();
    }
  } catch {
    // Audio playback blocked or unsupported — fail silently.
  }
}

// Call this from anywhere that already handles a user gesture (e.g. the
// bell's onClick) to unlock audio playback as early as possible, before
// the first real chime is due.
export function unlockNotificationAudio(): void {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}
