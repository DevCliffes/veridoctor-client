"use client";

import { TelehealthVideo } from "@veridoctor/telehealth/components";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../../store";

export default function CallPage() {
  const { callId } = useParams<{ callId: string }>();
  const userId = useSelector((state: RootState) => state.auth.identity);

  return (
    <TelehealthVideo
      meetId={callId}
      isOfferer={true}
      userId={userId ?? "provider"}
    />
  );
}
