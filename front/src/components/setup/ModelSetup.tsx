"use client";

import React, { useState, useEffect } from "react";
import { Loader2, HardDriveUpload, DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileBrowser } from "@/components/setup/FileBrowser";

export function ModelSetup({ onComplete }: { onComplete: () => void }) {
    const [checking, setChecking] = useState(true);
    const [installingOllama, setInstallingOllama] = useState(false);
    const [mounting, setMounting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFileBrowser, setShowFileBrowser] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/setup/ollama/status");
                if (res.ok) setChecking(false);
            } catch {
                setTimeout(checkStatus, 2000);
            }
        };
        checkStatus();
    }, []);

    const handleDownloadOllama = async () => {
        setInstallingOllama(true);
        try {
            const res = await fetch("http://127.0.0.1:8000/setup/ollama/download", { method: "POST" });
            if (!res.ok) throw new Error("Download failed");
            setInstallingOllama(false);
        } catch {
            setError("Failed to install local AI engine.");
            setInstallingOllama(false);
        }
    };

    const handleFileSelected = async (filePath: string) => {
        setShowFileBrowser(false);
        setMounting(true);
        try {
            const res = await fetch("http://127.0.0.1:8000/setup/model/mount", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gguf_path: filePath, model_name: "custom-local-model" }),
            });
            if (!res.ok) throw new Error("Failed to mount model");
            setMounting(false);
            onComplete();
        } catch {
            setError("Error mounting the model file.");
            setMounting(false);
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
                    To run queries completely locally, we need to load an AI model onto your device.
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-8 w-full max-w-2xl border border-red-500/20 backdrop-blur-sm text-sm text-center">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <div className="group flex flex-col items-center p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:border-white/20 hover:bg-black/50 transition-all">
                    <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-emerald-500/20">
                        <HardDriveUpload className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Load Local Model</h3>
                    <p className="text-sm text-neutral-400 mb-6 flex-grow text-center">
                        Already have a .gguf file? Select it from your computer to start immediately.
                    </p>
                    <Button
                        onClick={() => setShowFileBrowser(true)}
                        disabled={mounting || installingOllama}
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl h-11 font-medium transition-all shadow-lg shadow-emerald-900/30"
                    >
                        {mounting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {mounting ? "Mounting..." : "Choose File"}
                    </Button>
                </div>

                <div className="group flex flex-col items-center p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:border-white/20 hover:bg-black/50 transition-all">
                    <div className="h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-blue-500/20">
                        <DownloadCloud className="h-8 w-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Download Engine</h3>
                    <p className="text-sm text-neutral-400 mb-6 flex-grow text-center">
                        Don&apos;t have a model? We&apos;ll download the required AI engine automatically.
                    </p>
                    <Button
                        onClick={handleDownloadOllama}
                        disabled={mounting || installingOllama}
                        className="w-full bg-blue-600 text-white hover:bg-blue-500 rounded-xl h-11 font-medium transition-all shadow-lg shadow-blue-900/30"
                    >
                        {installingOllama ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {installingOllama ? "Installing..." : "Install Engine"}
                    </Button>
                </div>
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
