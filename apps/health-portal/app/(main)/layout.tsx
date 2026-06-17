"use client";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  ChevronDown,
  LayoutDashboard,
  LucideBookUser,
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
} from "@veridoctor/store";
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { access_token, identity, auth_code } = useAppSelector(
    (store) => store.auth
  );
  const dispatch = useAppDispatch();
  const authInfo = {
    isLoggedIn: access_token ? true : false,
    auth_code: auth_code,
    identity: identity,
  };
  const navItems: navITem[] = [
    {
      linkTo: "/dashboard",
      icon: <LayoutDashboard />,
      name: "Dashboard",
    },
    {
      linkTo: "/appointments",
      icon: <LucideCalendarCheck />,
      name: "Appointments",
    },
    {
      linkTo: "/book",
      icon: <LucideSearch />,
      name: "Find a Doctor",
    },
    {
      linkTo: "/prescriptions",
      icon: <LucideFileText />,
      name: "Prescriptions",
    },
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
      <div className="fixed bg-gray-50 top-0 left-0 h-svh w-full flex flex-col">
        <TopNav center={<p>Health portal</p>} right={<ProfileDropdown />} />
        <div className="flex h-full">
          <SideNav navItems={navItems} activePath={pathname} />
          <div className="w-full overflow-y-scroll bg-gray-200 p-4 rounded-lg">
            {children}
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
    router.push("/auth/login");
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
        <DropdownMenuItem className="cursor-pointer">
          <LucideBookUser />
          <p>Accounts</p>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
          <LucideLogOut />
          <p>Logout</p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
