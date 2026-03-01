"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Trash2, Star, Plus, HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileBrowser } from "@/components/setup/FileBrowser";

interface Model {
    id: string;
    name: string;
    gguf_path: string;
    file_size_bytes: number | null;
    is_default: boolean;
    registered_at: string | null;
    last_used_at: string | null;
}

interface ModelLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    activeModelId?: string;
    onModelLoaded?: () => void;
}

export function ModelLibrary({ isOpen, onClose, activeModelId, onModelLoaded }: ModelLibraryProps) {
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(false);
    const [showBrowser, setShowBrowser] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = useCallback(async () => {
        try {
            const res = await fetch("/api/rag/models");
            if (res.ok) setModels(await res.json());
        } catch {
            // quiet
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchModels();
    }, [isOpen, fetchModels]);

    const handleFileSelected = async (filePath: string) => {
        setShowBrowser(false);
        setRegistering(true);
        setError(null);

        // Derive a display name from filename
        const segments = filePath.replace(/\\/g, "/").split("/");
        const filename = segments[segments.length - 1];
        const name = filename.replace(/\.gguf$/i, "").replace(/[_-]/g, " ");

        try {
            const res = await fetch("/api/rag/models/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, gguf_path: filePath }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.detail || "Registration failed");
            }
            await fetchModels();
            onModelLoaded?.();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to register model");
        } finally {
            setRegistering(false);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await fetch(`/api/rag/models/${id}`, { method: "DELETE" });
            await fetchModels();
        } catch {
            setError("Failed to remove model");
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await fetch(`/api/rag/models/${id}/default`, { method: "POST" });
            await fetchModels();
        } catch {
            setError("Failed to set default");
        }
    };

    const formatSize = (bytes: number | null) => {
        if (!bytes) return "—";
        const gb = bytes / 1e9;
        return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl mx-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                            <HardDrive className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Model Library</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-6 mt-4 px-4 py-2 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/20">
                        {error}
                    </div>
                )}

                {/* Model list */}
                <div className="px-6 py-4 max-h-96 overflow-y-auto space-y-2">
                    {models.length === 0 ? (
                        <div className="text-center py-12 text-neutral-500">
                            <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No models registered yet</p>
                            <p className="text-xs mt-1">Add a .gguf file to get started</p>
                        </div>
                    ) : (
                        models.map((m) => (
                            <div
                                key={m.id}
                                className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${m.id === activeModelId
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white truncate">{m.name}</span>
                                        {m.id === activeModelId && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold uppercase tracking-wider">
                                                Active
                                            </span>
                                        )}
                                        {m.is_default && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded font-bold uppercase tracking-wider">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                                        {m.gguf_path} · {formatSize(m.file_size_bytes)}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleSetDefault(m.id)}
                                        title="Set as default"
                                        className={`p-1.5 rounded-lg transition-all ${m.is_default
                                                ? "text-blue-400"
                                                : "text-neutral-500 hover:text-blue-400 hover:bg-white/5"
                                            }`}
                                    >
                                        <Star className={`w-4 h-4 ${m.is_default ? "fill-current" : ""}`} />
                                    </button>
                                    <button
                                        onClick={() => handleRemove(m.id)}
                                        title="Remove model"
                                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                    <p className="text-xs text-neutral-500">{models.length} model{models.length !== 1 ? "s" : ""} registered</p>
                    <Button
                        onClick={() => setShowBrowser(true)}
                        disabled={registering}
                        className="bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl px-4 h-9 text-sm font-medium transition-all shadow-lg shadow-emerald-900/30"
                    >
                        {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Add Model
                    </Button>
                </div>
            </div>

            {showBrowser && (
                <FileBrowser
                    onSelect={handleFileSelected}
                    onCancel={() => setShowBrowser(false)}
                />
            )}
        </div>
    );
}
