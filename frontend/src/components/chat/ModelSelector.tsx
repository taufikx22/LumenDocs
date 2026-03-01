"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Cpu, Loader2, Check } from "lucide-react";

interface Model {
    id: string;
    name: string;
    gguf_path: string;
    file_size_bytes: number | null;
    is_default: boolean;
}

interface ModelSelectorProps {
    activeModel: { loaded: boolean; id?: string; name?: string } | null;
    onSwitch: (modelId: string) => Promise<void>;
    onManageModels: () => void;
}

export function ModelSelector({ activeModel, onSwitch, onManageModels }: ModelSelectorProps) {
    const [open, setOpen] = useState(false);
    const [models, setModels] = useState<Model[]>([]);
    const [switching, setSwitching] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    useEffect(() => {
        if (open) {
            fetch("/api/rag/models")
                .then((r) => r.json())
                .then(setModels)
                .catch(() => { });
        }
    }, [open]);

    const handleSwitch = async (id: string) => {
        if (switching || id === activeModel?.id) return;
        setSwitching(true);
        try {
            await onSwitch(id);
        } finally {
            setSwitching(false);
            setOpen(false);
        }
    };

    const formatSize = (bytes: number | null) => {
        if (!bytes) return "";
        const gb = bytes / 1e9;
        return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
    };

    const displayName = activeModel?.loaded ? activeModel.name : "No model";

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                disabled={switching}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
            >
                {switching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                ) : (
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="max-w-[160px] truncate font-medium">{displayName}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-neutral-500 font-bold border-b border-white/5">
                        Registered Models
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {models.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-neutral-500">
                                No models registered
                            </div>
                        ) : (
                            models.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => handleSwitch(m.id)}
                                    disabled={switching}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${m.id === activeModel?.id
                                            ? "bg-emerald-500/10 text-white"
                                            : "text-neutral-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{m.name}</div>
                                        <div className="text-[11px] text-neutral-500 truncate">
                                            {formatSize(m.file_size_bytes)}
                                            {m.is_default && " · Default"}
                                        </div>
                                    </div>
                                    {m.id === activeModel?.id && (
                                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    <div className="border-t border-white/5">
                        <button
                            onClick={() => { setOpen(false); onManageModels(); }}
                            className="w-full px-3 py-2.5 text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-center font-medium"
                        >
                            Manage Models
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
