"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasActiveSession } from "@/lib/storage";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    try {
      if (hasActiveSession()) {
        router.replace("/session");
      } else {
        router.replace("/onboarding");
      }
    } catch {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-amber-50/30 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[#F59E42] border-t-transparent animate-spin" />
    </div>
  );
}
