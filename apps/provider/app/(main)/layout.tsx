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

const WEB_APP_URL = "https://veridoctor.com";

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

interface ProviderProfile {
  first_name: string;
  last_name: string;
  title?: string;
}

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { access_token, identity, auth_code } = useAppSelector(
    (store) => store.auth,
  );
  const dispatch = useAppDispatch();

  const identityId = getIdentityId(identity);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);

  useEffect(() => {
    if (!identityId) return;
    axiosClient
      .get(`/provider/${identityId}/profile`)
      .then((res) => setProfile(res.data))
      .catch(() => {});
  }, [identityId]);

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
  const navItems: navITem[] = [
    { linkTo: "/dashboard", name: "Dashboard", icon: <LayoutDashboard /> },
    { linkTo: "/appointments", icon: <LucideCalendarCheck />, name: "Appointments" },
    { linkTo: "/patients", icon: <LucideUsers />, name: "Patients" },
    { linkTo: "/schedule", icon: <LucideClipboardClock />, name: "Schedule" },
    { linkTo: "/services", icon: <LucideStethoscope />, name: "Services" },
    { linkTo: "/prescriptions", icon: <LucideFileText />, name: "Prescriptions" },
    { linkTo: "/forms", icon: <LucideClipboardPen />, name: "Form studio" },
  ];

  const setAuthInfo = (token: TokenPayload) => {
    dispatch(setAccessToken(token.a_token));
    dispatch(setRefreshToken(token.refresh_token));
    dispatch(setIsLoggedIn());
  };

  return (
    <AuthWrapper
      authInfo={authInfo}
      setAuthInfo={(token) => setAuthInfo(token)}
      ensureAccessToken={ensureProviderAccessToken}
    >
      <GlobalNewAppointmentDialog userId={identityId} />

      <div className="fixed bg-white top-0 left-0 h-svh w-full flex flex-col overflow-hidden">
        <TopNav
          center={<p>{displayName}</p>}
          right={
            <div className="flex items-center gap-2">
              <NotificationBell identityId={identityId} />
              <ProfileDropdown dispatch={dispatch} />
            </div>
          }
        />
        <div className="flex flex-1 min-h-0">
          <SideNav navItems={navItems} activePath={pathname} />
          <div className="flex-1 min-h-0 overflow-y-auto bg-white p-1">
            <div className="max-w-6xl mx-auto pb-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
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
