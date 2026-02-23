"use client";

import { useState } from "react";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";
import { ModelSetup } from "@/components/setup/ModelSetup";

export default function Home() {
  const [setupComplete, setSetupComplete] = useState(false);

  if (!setupComplete) {
    return <ModelSetup onComplete={() => setSetupComplete(true)} />;
  }

  return (
    <main className="min-h-screen w-full bg-black text-white">
      <section className="flex justify-center items-start w-full">
        <RuixenMoonChat />
      </section>
    </main>
  );
}
