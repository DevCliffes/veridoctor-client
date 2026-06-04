"use client";

import { useAppSelector } from "../../hooks";

export default function Dashboard() {
  const token = useAppSelector((store) => store.auth);
  return (
    <div className="p-4 bg-white rounded-lg mx-4">
      <p className="text-2xl font-bold">Your health dashboard</p>
    </div>
  );
}
