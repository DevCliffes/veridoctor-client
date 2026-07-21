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
  ThemeToggle,
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

const WEB_APP_URL = "https://www.veridoctor.com";
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

type OnboardingStatus =
  | "incomplete_profile"
  | "pending_review"
  | "documents_rejected"
  | "approved";

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
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [identityId]);

  useEffect(() => {
    if (!identityId) return;
    if (!profile) return;
    if (profile.onboarding_status === "approved") return;

    const interval = setInterval(() => {
      axiosClient
        .get(`/provider/${identityId}/profile`)
        .then((res) => setProfile(res.data))
        .catch(() => {});
    }, ONBOARDING_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [identityId, profile?.onboarding_status]);

  const isProfilePage = pathname?.startsWith("/profile") ?? false;

  useEffect(() => {
    if (!identityId) return;
    if (profileLoading) return;
    if (!profile) return;
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

  const awaitingRedirect =
    !!profile && profile.onboarding_status !== "approved" && !isProfilePage;

  if (identityId && (profileLoading || awaitingRedirect)) {
    return <LoadingShell />;
  }

  const gateActive = !!profile && profile.onboarding_status !== "approved";

  return (
    <AuthWrapper
      authInfo={authInfo}
      setAuthInfo={(token) => setAuthInfo(token)}
      ensureAccessToken={ensureProviderAccessToken}
    >
      {!gateActive && <GlobalNewAppointmentDialog userId={identityId} />}

      <div className="fixed bg-background text-foreground top-0 left-0 h-svh w-full flex flex-col overflow-hidden">
        <TopNav
          center={<p>{displayName}</p>}
          right={
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell identityId={identityId} />
              <ProfileDropdown dispatch={dispatch} />
            </div>
          }
        />
        <div className="flex flex-1 min-h-0">
          {!gateActive && <SideNav navItems={navItems} activePath={pathname} />}
          <div className="flex-1 min-h-0 overflow-y-auto bg-background p-1">
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
    <div className="fixed bg-background top-0 left-0 h-svh w-full flex items-center justify-center">
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
