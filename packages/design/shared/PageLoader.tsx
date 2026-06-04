import * as React from "react";

function PageLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* Spinner Container */}
      <div className="relative w-24 h-24">
        {/* Spinner Line */}
        <div className="absolute inset-0 border-t-2 border-t-blue-500 border-r-4 border-r-transparent rounded-full animate-spin"></div>

        {/* Image */}
        <img
          src="/veri-logo.svg"
          className="absolute inset-0 w-full h-full rounded-full p-1"
        />
      </div>
    </div>
  );
}

export { PageLoader };
