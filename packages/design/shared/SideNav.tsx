"use client";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import * as React from "react";

export type navITem = {
  linkTo: string;
  icon: React.ReactNode;
  name: string;
};

function SideNav({
  navItems,
  activePath,
}: {
  navItems: navITem[];
  activePath?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const openMobileDropdown = () => {
    setDropdownOpen(true);
  };

  const closeMobileDropdown = () => {
    setDropdownOpen(false);
  };

  /**
   * checks whether a path is active by comparing it to the activePath prop
   * @param path pathname string
   * @returns boolean indicating whether the path is active
   */
  const isActive = (path: string) => {
    return activePath === path || activePath?.startsWith(path + "/");
  };

  return (
    <>
      <div className="hidden lg:flex">
        <div
          className={` overflow-visible relative bg-white flex-col border-r h-full transition-all ease-in-out duration-75 ${sidebarOpen ? "w-44" : "w-16"}`}
        >
          <div className="mt-10 flex justify-center">
            {/* Replace this with the actual logo */}
            <p className="font-extrabold text-3xl">
              V<span className="text-blue-500">D</span>
            </p>
          </div>
          <div className="absolute -right-2">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="rounded-full bg-gray-100 cursor-pointer shadow-md border"
            >
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </button>
          </div>
          <div className="pt-10 flex flex-col gap-2">
            {navItems.map((navItem, index) => (
              <a href={navItem.linkTo} key={index}>
                <div
                  className={`flex gap-2 p-2 items-center hover:bg-primary/70 cursor-pointer ${isActive(navItem.linkTo) ? "bg-primary/70" : ""} ${sidebarOpen ? "justify-start" : "justify-center"}`}
                >
                  {navItem.icon}
                  {sidebarOpen && <p className="text-sm">{navItem.name}</p>}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE NAV */}
      <div className="fixed top-0 left-0 lg:hidden items-center justify-between px-4 h-fit py-2 z-50">
        {!dropdownOpen ? (
          <>
            <Menu onClick={openMobileDropdown} />
          </>
        ) : (
          <div className="w-full h-full fixed top-0 left-0 p-4 bg-white">
            <div className="flex justify-between mb-4">
              {/* LOGO HERE */}
              <p className="font-extrabold text-3xl">
                V<span className="text-blue-500">D</span>
              </p>
              <X onClick={closeMobileDropdown} />
            </div>
            <div className="flex flex-col m-auto px-4 mt-10">
              {navItems.map((navItem, index) => (
                <a href={navItem.linkTo} key={index}>
                  <div
                    onClick={closeMobileDropdown}
                    className={`flex gap-2 items-center py-4 px-2 ${isActive(navItem.linkTo) ? "bg-primary/70" : ""}`}
                  >
                    {navItem.icon}
                    <p className="text-sm">{navItem.name}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export { SideNav };
