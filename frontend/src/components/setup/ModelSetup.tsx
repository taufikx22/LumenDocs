"use client";

import React, { useState, useEffect } from "react";
import { Loader2, HardDriveUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileBrowser } from "@/components/setup/FileBrowser";

export function ModelSetup({ onComplete }: { onComplete: () => void }) {
    const [checking, setChecking] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFileBrowser, setShowFileBrowser] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                // Check if backend is up and if any models are already registered
                const healthRes = await fetch("/api/rag/healthz");
                if (!healthRes.ok) { setTimeout(check, 2000); return; }

                const modelsRes = await fetch("/api/rag/models");
                if (modelsRes.ok) {
                    const models = await modelsRes.json();
                    if (models.length > 0) {
                        // Models already registered — check if one is loaded
                        const activeRes = await fetch("/api/rag/models/active");
                        if (activeRes.ok) {
                            const active = await activeRes.json();
                            if (active.loaded) { onComplete(); return; }
                        }
                        // Load the default or first model
                        const target = models.find((m: { is_default: boolean }) => m.is_default) || models[0];
                        await fetch(`/api/rag/models/${target.id}/load`, { method: "POST" });
                        onComplete();
                        return;
                    }
                }
                setChecking(false);
            } catch {
                setTimeout(check, 2000);
            }
        };
        check();
    }, [onComplete]);

    const handleFileSelected = async (filePath: string) => {
        setShowFileBrowser(false);
        setRegistering(true);
        setError(null);

        const segments = filePath.replace(/\\/g, "/").split("/");
        const filename = segments[segments.length - 1];
        const name = filename.replace(/\.gguf$/i, "").replace(/[_-]/g, " ");

        try {
            const regRes = await fetch("/api/rag/models/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, gguf_path: filePath }),
            });
            if (!regRes.ok) throw new Error("Registration failed");
            const model = await regRes.json();

            // Set as default and load
            await fetch(`/api/rag/models/${model.id}/default`, { method: "POST" });
            const loadRes = await fetch(`/api/rag/models/${model.id}/load`, { method: "POST" });
            if (!loadRes.ok) throw new Error("Failed to load model");

            onComplete();
        } catch {
            setError("Failed to set up the model. Please try again.");
            setRegistering(false);
        }
    };

    if (checking) {
        return (
            <div
                className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center text-white"
                style={{ backgroundImage: "url('/ruixen_moon_2.png')", backgroundAttachment: "fixed" }}
            >
                <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-12 border border-white/10 shadow-2xl flex flex-col items-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-400 mb-6" />
                    <h2 className="text-xl font-medium text-white/90">Starting AI Engine...</h2>
                    <p className="text-sm text-neutral-400 mt-2">Connecting to local backend</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center text-white p-8"
            style={{ backgroundImage: "url('/ruixen_moon_2.png')", backgroundAttachment: "fixed" }}
        >
            <div className="text-center mb-10">
                <h1 className="text-5xl font-black tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    LumenDocs
                </h1>
                <p className="mt-4 text-neutral-300 max-w-lg mx-auto text-[15px] leading-relaxed">
                    Select a local GGUF model to power your AI assistant. Your data stays on your machine.
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-8 w-full max-w-lg border border-red-500/20 backdrop-blur-sm text-sm text-center">
                    {error}
                </div>
            )}

            <div className="group flex flex-col items-center p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:border-white/20 hover:bg-black/50 transition-all w-full max-w-lg">
                <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-emerald-500/20">
                    <HardDriveUpload className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Load a GGUF Model</h3>
                <p className="text-sm text-neutral-400 mb-6 text-center">
                    Browse your computer and select a .gguf model file to get started.
                </p>
                <Button
                    onClick={() => setShowFileBrowser(true)}
                    disabled={registering}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl h-11 font-medium transition-all shadow-lg shadow-emerald-900/30"
                >
                    {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {registering ? "Loading Model..." : "Browse Files"}
                </Button>
            </div>

            <div className="flex items-center justify-center flex-wrap gap-4 mt-10 text-[11px] uppercase tracking-[0.25em] font-black text-neutral-500/50 select-none">
                <span>SECURE</span>
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                <span>LOCAL-FIRST</span>
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                <span>PRIVACY-DRIVEN</span>
            </div>

            {showFileBrowser && (
                <FileBrowser
                    onSelect={handleFileSelected}
                    onCancel={() => setShowFileBrowser(false)}
                />
            )}
        </div>
    );
}
