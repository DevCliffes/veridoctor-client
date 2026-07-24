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
// NEW: ThemeProvider + ThemeToggle, same components already used across
// apps/provider, apps/telehealth, apps/facility, apps/health-portal.
// Mounted HERE rather than in apps/web's root layout.tsx on purpose --
// that root layout also wraps the public marketing site (Navbar/Footer,
// landing pages), which has no dark: variants and isn't meant to change
// mode at all. Scoping the provider to just this patient-portal shell
// keeps the toggle working here without touching the marketing site.
import { ThemeProvider, ThemeToggle } from "@veridoctor/design";
import {
  setIsLoggedIn,
  setAccessToken,
  setRefreshToken,
  setUser,
} from "@veridoctor/store";
import { axiosClient, ensurePatientAccessToken } from "@veridoctor/api-client";
import NotificationBell from "../../components/NotificationBell";

export const dynamic = "force-dynamic";

// FIX: this was previously hardcoded to
// "https://veridoctor-client-web.vercel.app" -- a Vercel preview alias,
// not the production custom domain. Session and pending-redirect cookies
// are written with Domain=.veridoctor.com, which is NOT visible on a
// vercel.app domain (it's not a subdomain of veridoctor.com). Sending an
// unauthenticated/timed-out user there meant the pending-redirect cookie
// (and any session cookies) were invisible once they landed, breaking the
// "return to the page you were on after logging in again" flow -- caught
// via live testing, not code review. Now pinned to the confirmed
// canonical production domain, matching provider's layout exactly.
const WEB_APP_URL = "https://www.veridoctor.com";

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

  // FIX: identity can end up as the literal string "null" or "undefined"
  // (e.g. if something upstream does String(decoded.identity) on a value
  // that was actually null/undefined when the token was decoded), which
  // passes typeof === "string" but isn't a real id. Treat those the same
  // as "no identity yet" so we don't pass a bad value down to
  // NotificationBell and trigger a 500 on the notifications poll.
  const identityId =
    typeof identity === "string" && identity !== "null" && identity !== "undefined"
      ? identity
      : "";

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
    // NEW: ThemeProvider mounted here, not in apps/web's root layout.
    // Note the real limitation this carries: next-themes toggles the
    // "dark" class on the actual <html> element regardless of where in
    // the tree its provider sits -- it doesn't scope the class to a
    // wrapping div. In practice this is fine for our case: the marketing
    // route group unmounts this entire layout on navigation (different
    // route group => different layout tree), and the marketing pages
    // themselves have zero dark: variants, so even in the moment before
    // any residual class is cleared they render identically either way.
    // If that ever changes (e.g. marketing pages start using dark:
    // variants), this will need a real per-subtree scoping approach
    // instead of next-themes' default document-level toggle.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthWrapper
        authInfo={authInfo}
        setAuthInfo={(token) => setAuthInfo(token)}
        ensureAccessToken={ensurePatientAccessToken}
      >
        {/* ✅ overflow-hidden on the outer shell so only the inner content
            area scrolls — prevents the whole page from being measured
            against the wrong height and clipping the last bit of content.
            bg-white -> bg-background: this was the one hardcoded shell
            color left over from before dark mode was wired in here; every
            other app's shell already used bg-background. */}
        <div className="fixed bg-background top-0 left-0 h-svh w-full flex flex-col overflow-hidden">
          <TopNav
            center={<p>Health portal</p>}
            right={
              <div className="flex items-center gap-2">
                <NotificationBell identityId={identityId} />
                {/* NEW: the actual dark/light switch -- this is what was
                    missing. Same component already used in the provider,
                    telehealth, facility, and health-portal apps. */}
                <ThemeToggle />
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
                bottom of the viewport.
                bg-white -> bg-background: matches the outer shell fix above. */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-background p-4 rounded-lg">
              {/* Removed max-w-5xl mx-auto — matches the provider dashboard
                  fix. w-full lets content use the full available width at
                  any zoom level instead of being boxed into a fixed cap. */}
              <div className="w-full pb-8">
                {profileReady ? children : (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AuthWrapper>
    </ThemeProvider>
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
