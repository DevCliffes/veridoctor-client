"use client";

import { ReactNode, useState } from "react";
import { LucidePlus, LucideMinus } from "@veridoctor/design/icons";

type legalAccordionProps = {
  title: string;
  children: ReactNode;
};
export default function LegalAccordion({
  title,
  children,
}: legalAccordionProps) {
  const [accordionOpen, setAccordionOpen] = useState(false);
  return (
    <div className="w-full border-t-2 border-black py-4">
      <div
        onClick={() => setAccordionOpen((prev) => !prev)}
        className="w-full flex items-start justify-between cursor-pointer"
      >
        <p
          className={`text-lg md:text-2xl font-bold mb-4 ${accordionOpen && "underline"}`}
        >
          {title}
        </p>
        {accordionOpen ? (
          <LucideMinus className="text-blue-500 text-xl md:text-3xl min-w-10" />
        ) : (
          <LucidePlus className="text-blue-500 text-xl md:text-3xl min-w-10" />
        )}
      </div>
      {accordionOpen ? (
        <div className="md:text-lg flex flex-col gap-4">{children}</div>
      ) : (
        <></>
      )}
    </div>
  );
}
