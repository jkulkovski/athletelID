"use client";

import { useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function Page() {
  useEffect(() => {
    const slot = document.getElementById("wallet-slot");
    if (slot) {
      // Render wallet connect into nav slot
    }
  }, []);

  return (
    <div className="space-y-6">
      <Dashboard />
    </div>
  );
}


