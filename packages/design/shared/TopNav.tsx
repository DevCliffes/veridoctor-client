import * as React from "react";

function TopNav({
  left,
  center,
  right,
}: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <nav className="w-full h-16 px-4 border-b bg-white flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">{left}</div>
      <div className="hidden md:flex items-center gap-6">{center}</div>
      <div className="flex items-center gap-3">{right}</div>
    </nav>
  );
}

export { TopNav };
