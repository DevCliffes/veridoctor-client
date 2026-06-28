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
  const [tooltip, setTooltip] = React.useState<{ name: string; y: number } | null>(null);

  const openMobileDropdown = () => setDropdownOpen(true);
  const closeMobileDropdown = () => setDropdownOpen(false);

  const isActive = (path: string) => {
    return activePath === path || activePath?.startsWith(path + "/");
  };

  // ── Moved outside JSX to avoid parser issues with dot expressions ─────────
  const handleMouseEnter = (name: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!sidebarOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({ name, y: rect.top + rect.height / 2 });
    }
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <>
      <div className="hidden lg:flex">
        <div
          className={`overflow-visible relative bg-white flex-col border-r h-full transition-all ease-in-out duration-75 ${
            sidebarOpen ? "w-44" : "w-16"
          }`}
        >
          <div className="mt-10 flex justify-center">
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
              
                href={navItem.linkTo}
                key={index}
                onMouseEnter={(e) => handleMouseEnter(navItem.name, e)}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  className={`flex gap-2 p-2 items-center hover:bg-primary/70 cursor-pointer ${
                    isActive(navItem.linkTo) ? "bg-primary/70" : ""
                  } ${sidebarOpen ? "justify-start" : "justify-center"}`}
                >
                  {navItem.icon}
                  {sidebarOpen && <p className="text-sm">{navItem.name}</p>}
                </div>
              </a>
            ))}
          </div>

          {/* Tooltip — only when sidebar is collapsed */}
          {!sidebarOpen && tooltip && (
            <div
              className="fixed z-50 pointer-events-none"
              style={{ top: tooltip.y, left: 68, transform: "translateY(-50%)" }}
            >
              <div className="relative bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap">
                <span
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{
                    left: -6,
                    width: 0,
                    height: 0,
                    borderTop: "5px solid transparent",
                    borderBottom: "5px solid transparent",
                    borderRight: "6px solid #1f2937",
                  }}
                />
                {tooltip.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE NAV */}
      <div className="fixed top-0 left-0 lg:hidden items-center justify-between px-4 h-fit py-2 z-50">
        {!dropdownOpen ? (
          <Menu onClick={openMobileDropdown} />
        ) : (
          <div className="w-full h-full fixed top-0 left-0 p-4 bg-white">
            <div className="flex justify-between mb-4">
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
                    className={`flex gap-2 items-center py-4 px-2 ${
                      isActive(navItem.linkTo) ? "bg-primary/70" : ""
                    }`}
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
