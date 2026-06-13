"use client";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  ChevronDown,
  LayoutDashboard,
  LucideBookUser,
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
import {
  setIsLoggedIn,
  setAccessToken,
  setRefreshToken,
} from "@veridoctor/store";
import { usePathname } from "next/navigation";

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

  const authInfo = {
    isLoggedIn: access_token ? true : false,
    auth_code: auth_code,
    identity: identity,
  };

  const navItems: navITem[] = [
    { linkTo: "/dashboard", name: "Dashboard", icon: <LayoutDashboard /> },
    { linkTo: "/appointments", icon: <LucideCalendarCheck />, name: "Appointments" },
    { linkTo: "/patients", icon: <LucideUsers />, name: "Patients" },
    { linkTo: "/calls", icon: <Video />, name: "Calls" },
    { linkTo: "/schedule", icon: <LucideClipboardClock />, name: "Schedule" },
    { linkTo: "/services", icon: <LucideStethoscope />, name: "Services" },
    { linkTo: "/prescriptions", icon: <LucideFileText />, name: "Prescriptions" },
    { linkTo: "/forms", icon: <LucideClipboardPen />, name: "Form studio" },
    { linkTo: "/settings", icon: <LucideCog />, name: "Settings" },
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
    >
      <div className="fixed bg-blue-50 top-0 left-0 h-svh w-full flex flex-col">
        <TopNav center={<p>Dr. John Doe</p>} right={<ProfileDropdown />} />
        <div className="flex h-full">
          <SideNav navItems={navItems} activePath={pathname} />
          <div className="w-full overflow-y-scroll bg-neutral-100 p-1">
            {children}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

function ProfileDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex gap-2 border-2 hover:cursor-pointer items-center p-1 md:border-2 md:rounded-full">
        <LucideCircleUser />
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem className="cursor-pointer">
          <LucideUser />
          <p>Profile</p>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <LucideBookUser />
          <p>Accounts</p>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <LucideLogOut />
          <p>Logout</p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
