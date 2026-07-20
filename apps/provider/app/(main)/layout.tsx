"use client";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  ChevronDown,
  LayoutDashboard,
  LucideCalendarCheck,
  LucideCircleUser,
  LucideClipboardClock,
  LucideClipboardPen,
  LucideCog,
  LucideFileText,
  LucideLogOut,
  LucideStethoscope,
  LucideUser,
  LucideUsers,
  Video,
} from "@veridoctor/design/icons";
import {
  AuthWrapper,
  navITem,
  SideNav,
  TokenPayload,
  TopNav,
} from "@veridoctor/design/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@veridoctor/design/components";
import { axiosClient, ensureProviderAccessToken } from "@veridoctor/api-client";
import {
  setIsLoggedIn,
  setAccessToken,
  setRefreshToken,
} from "@veridoctor/store";
import { usePathname, useRouter } from "next/navigation";
import { GlobalNewAppointmentDialog } from "../../components/GlobalNewAppointmentDialog";
import NotificationBell from "../../components/NotificationBell";

// FIX: this was already "https://veridoctor.com" (no www), while
// health-portal's equivalent constant was hardcoded to a stale Vercel
// preview alias ("https://veridoctor-client-web.vercel.app"). Both are now
// pinned to the confirmed canonical production domain, www.veridoctor.com,
// which is what actually serves / and /auth/login (per Vercel request
// logs) and matches the Domain=.veridoctor.com scope that session and
// pending-redirect cookies are written with. A mismatch here sends the
// browser to a domain outside that cookie scope, which silently breaks
// the pending-redirect handoff on timeout.
const WEB_APP_URL = "https://www.veridoctor.com";

// Poll cadence while a provider is waiting on onboarding approval, so they
// get unlocked automatically without having to log out/in.
const ONBOARDING_POLL_INTERVAL_MS = 30000;

function getIdentityId(identity: unknown): string {
  if (typeof identity === "string") {
    if (!identity) return "";
    try {
      const parsed = JSON.parse(identity);
      if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
        return parsed.id;
      }
    } catch {}
    return identity;
  }
  if (identity && typeof identity === "object" && "id" in identity) {
    const val = (identity as Record<string, unknown>).id;
    if (typeof val === "string") return val;
  }
  return "";
}

// Mirrors the derived enum returned by ProviderProfileView.get() on the
// backend. Kept as a union (not a generic string) so a typo in a
// comparison anywhere in this file fails at compile time instead of
// silently never matching.
type OnboardingStatus =
  | "incomplete_profile"
  | "pending_review"
  | "documents_rejected"
  | "approved";

// FIX: pulled out of OnboardingStatusBanner as its own named type. The
// previous inline object type nested inside Record<Exclude<...>, {...}>
// (semicolon-separated fields on one line) tripped up this Next.js/
// Turbopack version's parser with "Expected ',', got ';'" at build time,
// even though it's valid TypeScript. A named alias used as the plain
// second generic argument avoids the inline-object-in-generic parse path
// entirely -- no behavior change, purely a syntax workaround.
type OnboardingBannerConfig = {
  className: string;
  title: string;
  body: string;
};

interface ProviderProfile {
  first_name: string;
  last_name: string;
  title?: string;
  profile_complete: boolean;
  onboarding_status: OnboardingStatus;
}

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { access_token, identity, auth_code } = useAppSelector(
    (store) => store.auth,
  );
  const dispatch = useAppDispatch();

  const identityId = getIdentityId(identity);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ── Initial profile fetch ───────────────────────────────────────────
  useEffect(() => {
    if (!identityId) return;

    let cancelled = false;
    setProfileLoading(true);

    axiosClient
      .get(`/provider/${identityId}/profile`)
      .then((res) => {
        if (cancelled) return;
        setProfile(res.data);
      })
      .catch(() => {
        // Fail open: if the profile fetch itself errors out (network
        // blip, Render cold start), don't lock the provider out of the
        // whole app. `profile` stays null, and the render logic below
        // treats null profile as "let them through, gate inactive."
        // Only an explicit onboarding_status !== "approved" blocks access.
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [identityId]);

  // ── Poll while not yet approved, so approval unblocks without re-login ──
  useEffect(() => {
    if (!identityId) return;
    if (!profile) return; // wait for the initial load to resolve first
    if (profile.onboarding_status === "approved") return; // nothing to poll for

    const interval = setInterval(() => {
      axiosClient
        .get(`/provider/${identityId}/profile`)
        .then((res) => setProfile(res.data))
        .catch(() => {});
    }, ONBOARDING_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [identityId, profile?.onboarding_status]);

  const isProfilePage = pathname?.startsWith("/profile") ?? false;

  // ── Redirect gate ────────────────────────────────────────────────────
  // Gate on onboarding_status !== "approved", not on "first login" — this
  // also re-blocks a provider if a document gets rejected later, or if
  // they close the tab mid-onboarding and come back on day 3.
  useEffect(() => {
    if (!identityId) return;
    if (profileLoading) return;
    if (!profile) return; // fetch failed — fail open, don't gate
    if (profile.onboarding_status !== "approved" && !isProfilePage) {
      router.replace("/profile");
    }
  }, [identityId, profileLoading, profile, isProfilePage, router]);

  const displayName = profile
    ? `${profile.title ?? "Dr."} ${profile.first_name} ${profile.last_name}`
    : "\u00A0";

  const authInfo = {
    isLoggedIn: access_token ? true : false,
    auth_code: auth_code,
    identity: identity,
    loginUrl: WEB_APP_URL,
  };

  // ── Calls and Settings removed from nav (hidden from UI, pages still exist)
  // Reordered per request: Dashboard, Appointments, Services, Schedule,
  // Patients, then the rest unchanged (Prescriptions, Form studio).
  const navItems: navITem[] = [
    { linkTo: "/dashboard", name: "Dashboard", icon: <LayoutDashboard /> },
    { linkTo: "/appointments", icon: <LucideCalendarCheck />, name: "Appointments" },
    { linkTo: "/services", icon: <LucideStethoscope />, name: "Services" },
    { linkTo: "/schedule", icon: <LucideClipboardClock />, name: "Schedule" },
    { linkTo: "/patients", icon: <LucideUsers />, name: "Patients" },
    { linkTo: "/prescriptions", icon: <LucideFileText />, name: "Prescriptions" },
    { linkTo: "/forms", icon: <LucideClipboardPen />, name: "Form studio" },
  ];

  const setAuthInfo = (token: TokenPayload) => {
    dispatch(setAccessToken(token.a_token));
    dispatch(setRefreshToken(token.refresh_token));
    dispatch(setIsLoggedIn());
  };

  // While the profile fetch is in flight, or while we're about to redirect
  // an unapproved provider off a blocked route, render a blank shell
  // instead of the dashboard — otherwise there's a flash of real content
  // before the redirect (or the SideNav) kicks in.
  const awaitingRedirect =
    !!profile && profile.onboarding_status !== "approved" && !isProfilePage;

  if (identityId && (profileLoading || awaitingRedirect)) {
    return <LoadingShell />;
  }

  // Gate is only ever "active" in the render below when the provider is
  // unapproved AND already on /profile — every other unapproved case was
  // already redirected above.
  const gateActive = !!profile && profile.onboarding_status !== "approved";

  return (
    <AuthWrapper
      authInfo={authInfo}
      setAuthInfo={(token) => setAuthInfo(token)}
      ensureAccessToken={ensureProviderAccessToken}
    >
      {!gateActive && <GlobalNewAppointmentDialog userId={identityId} />}

      <div className="fixed bg-white top-0 left-0 h-svh w-full flex flex-col overflow-hidden">
        <TopNav
          center={<p>{displayName}</p>}
          right={
            <div className="flex items-center gap-2">
              {/* Bell now renders regardless of approval status — a
                  provider with a rejected document is exactly who needs
                  to see it. Only SideNav and the new-appointment dialog
                  stay behind the gate, since those genuinely require an
                  approved profile to be usable. */}
              <NotificationBell identityId={identityId} />
              <ProfileDropdown dispatch={dispatch} />
            </div>
          }
        />
        <div className="flex flex-1 min-h-0">
          {!gateActive && <SideNav navItems={navItems} activePath={pathname} />}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white p-1">
            {/* Removed max-w-6xl mx-auto — that capped content at 1152px
                and left a growing dead-space border around it at lower
                zoom levels. w-full + px-4 lets the dashboard grid and
                charts actually use the available width at any zoom. */}
            <div className="w-full px-4 pb-8">
              {gateActive && profile && (
                <OnboardingStatusBanner status={profile.onboarding_status} />
              )}
              {children}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

function LoadingShell() {
  return (
    <div className="fixed bg-white top-0 left-0 h-svh w-full flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
    </div>
  );
}

function OnboardingStatusBanner({ status }: { status: OnboardingStatus }) {
  const config: Record<Exclude<OnboardingStatus, "approved">, OnboardingBannerConfig> = {
    incomplete_profile: {
      className: "bg-amber-50 border-amber-300 text-amber-900",
      title: "Finish setting up your profile",
      body: "Please complete all required fields and documents below before you can access the dashboard.",
    },
    pending_review: {
      className: "bg-blue-50 border-blue-300 text-blue-900",
      title: "Your documents are under review",
      body: "This usually takes 1–2 business days. You'll be unlocked automatically once approved — no need to log out and back in.",
    },
    documents_rejected: {
      className: "bg-red-50 border-red-300 text-red-900",
      title: "One or more documents were rejected",
      body: "Please review the flagged documents below and re-upload them so we can continue the review.",
    },
  };

  if (status === "approved") return null;
  const { className, title, body } = config[status];

  return (
    <div className={`w-full border rounded-lg px-4 py-3 mb-4 ${className}`}>
      <p className="font-medium">{title}</p>
      <p className="text-sm mt-0.5">{body}</p>
    </div>
  );
}

function ProfileDropdown({
  dispatch,
}: {
  dispatch: ReturnType<typeof useAppDispatch>;
}) {
  const router = useRouter();

  const handleLogout = () => {
    dispatch(setAccessToken(""));
    dispatch(setRefreshToken(""));
    setTimeout(() => {
      window.location.href = WEB_APP_URL;
    }, 100);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex gap-2 border-2 hover:cursor-pointer items-center p-1 md:border-2 md:rounded-full">
        <LucideCircleUser />
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/profile")}
        >
          <LucideUser size={16} />
          <p>Profile</p>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleLogout}
        >
          <LucideLogOut size={16} />
          <p>Logout</p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
