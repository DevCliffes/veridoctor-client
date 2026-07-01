"use client";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  ChevronDown,
  LayoutDashboard,
  LucideActivitySquare,
  LucideCalendarCheck,
  LucideCircleUser,
  LucideFileText,
  LucideLogOut,
  LucideSearch,
  LucideUser,
} from "@veridoctor/design/icons";
import {
  AuthWrapper,
  navITem,
  SideNav,
  TokenPayload,
  TopNav,
} from "@veridoctor/design/shared";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@veridoctor/design/components";
import {
  setIsLoggedIn,
  setAccessToken,
  setRefreshToken,
  setUser,
} from "@veridoctor/store";
import { axiosClient } from "@veridoctor/api-client";
import NotificationBell from "../../components/NotificationBell";

export const dynamic = "force-dynamic";

// ✅ Hardcoded — avoids blank env var issue
const WEB_APP_URL = "https://veridoctor-client-web.vercel.app";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { access_token, identity, auth_code, user } = useAppSelector(
    (store) => store.auth
  );
  const dispatch = useAppDispatch();
  const [profileReady, setProfileReady] = useState(false);

  const identityId = typeof identity === "string" ? identity : "";

  const authInfo = {
    isLoggedIn: access_token ? true : false,
    auth_code: auth_code,
    identity: identity,
    // ✅ Tell AuthWrapper to redirect to web app instead of /auth/login
    loginUrl: WEB_APP_URL,
  };

  const navItems: navITem[] = [
    { linkTo: "/dashboard", icon: <LayoutDashboard />, name: "Dashboard" },
    { linkTo: "/appointments", icon: <LucideCalendarCheck />, name: "Appointments" },
    { linkTo: "/book", icon: <LucideSearch />, name: "Find a Doctor" },
    { linkTo: "/records", icon: <LucideActivitySquare />, name: "Health Records" },
    { linkTo: "/prescriptions", icon: <LucideFileText />, name: "Prescriptions" },
  ];

  const setAuthInfo = (token: TokenPayload) => {
    dispatch(setAccessToken(token.a_token));
    dispatch(setRefreshToken(token.refresh_token));
    dispatch(setIsLoggedIn());
  };

  useEffect(() => {
    if (user?.email) {
      setProfileReady(true);
      return;
    }
    if (!identity || typeof identity !== "string") {
      setProfileReady(true);
      return;
    }
    axiosClient
      .get("/identity/register/" + identity)
      .then((res) => {
        dispatch(
          setUser({
            id: res.data.id ?? identity,
            first_name: res.data.first_name ?? "",
            last_name: res.data.last_name ?? "",
            email: res.data.email ?? "",
          })
        );
      })
      .catch(() => {})
      .finally(() => {
        setProfileReady(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  return (
    <AuthWrapper
      authInfo={authInfo}
      setAuthInfo={(token) => setAuthInfo(token)}
    >
      {/* ✅ overflow-hidden on the outer shell so only the inner content
          area scrolls — prevents the whole page from being measured
          against the wrong height and clipping the last bit of content. */}
      <div className="fixed bg-gray-50 top-0 left-0 h-svh w-full flex flex-col overflow-hidden">
        <TopNav
          center={<p>Health portal</p>}
          right={
            <div className="flex items-center gap-2">
              <NotificationBell identityId={identityId} />
              <ProfileDropdown />
            </div>
          }
        />
        {/* ✅ flex-1 min-h-0 — lets this row actually shrink to the
            remaining height below TopNav instead of inheriting h-full
            from a parent that already includes TopNav's height. */}
        <div className="flex flex-1 min-h-0">
          <SideNav navItems={navItems} activePath={pathname} />
          {/* ✅ flex-1 min-h-0 overflow-y-auto — this is now the single
              scroll container, correctly bounded between TopNav and the
              bottom of the viewport. */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-200 p-4 rounded-lg">
            {/* ✅ max-w-5xl mx-auto — caps content width and centers it
                instead of letting it stretch/stick to the left on wide
                screens. pb-8 gives breathing room so the last element
                (e.g. the footer disclaimer) isn't flush against the
                scroll boundary. */}
            <div className="max-w-5xl mx-auto pb-8">
              {profileReady ? children : (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

function ProfileDropdown() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(setAccessToken(""));
    dispatch(setRefreshToken(""));
    // ✅ Small delay so Redux clears before redirect
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
          className="cursor-pointer flex gap-2"
          onClick={() => router.push("/profile")}
        >
          <LucideUser />
          <p>Profile</p>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
          <LucideLogOut />
          <p>Logout</p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
