"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Folder, FileText, ArrowLeft, HardDrive, X, Loader2, Search } from "lucide-react";

interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
    size: number | null;
    ext: string | null;
}

interface BrowseResponse {
    current: string;
    parent: string | null;
    drives: string[];
    items: FileItem[];
}

interface FileBrowserProps {
    onSelect: (filePath: string) => void;
    onCancel: () => void;
    filterExtensions?: string[];
}

export function FileBrowser({ onSelect, onCancel, filterExtensions = [".gguf"] }: FileBrowserProps) {
    const [currentPath, setCurrentPath] = useState("");
    const [items, setItems] = useState<FileItem[]>([]);
    const [drives, setDrives] = useState<string[]>([]);
    const [parentPath, setParentPath] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    const browse = useCallback(async (path: string) => {
        setLoading(true);
        setError(null);
        setSelectedFile(null);
        setSearchQuery("");
        try {
            const url = path
                ? `http://127.0.0.1:8000/setup/browse?path=${encodeURIComponent(path)}`
                : "http://127.0.0.1:8000/setup/browse";
            const res = await fetch(url);
            if (!res.ok) {
                const detail = await res.json().catch(() => ({ detail: "Failed to browse" }));
                throw new Error(detail.detail || "Failed to browse");
            }
            const data: BrowseResponse = await res.json();
            setCurrentPath(data.current);
            setParentPath(data.parent);
            setDrives(data.drives);
            setItems(data.items);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to browse filesystem");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { browse(""); }, [browse]);

    const filteredItems = items.filter((item) => {
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (item.is_dir) return true;
        if (filterExtensions.length === 0) return true;
        return filterExtensions.some((ext) => item.ext === ext);
    });

    const formatSize = (bytes: number | null) => {
        if (bytes === null) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1073741824).toFixed(2)} GB`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="bg-neutral-900/95 backdrop-blur-2xl rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-white/10">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Select Model File</h2>
                    <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-neutral-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => parentPath && browse(parentPath)}
                            disabled={!parentPath || loading}
                            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-400 hover:text-white"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="flex-1 text-sm text-neutral-300 bg-white/5 rounded-lg px-3 py-2 truncate font-mono border border-white/5">
                            {currentPath}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {drives.map((drive) => (
                            <button
                                key={drive}
                                onClick={() => browse(drive)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                            >
                                <HardDrive size={12} />
                                {drive}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-5 py-2 border-b border-white/5">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Filter files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-1 min-h-[300px] custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-red-400 text-sm px-4 text-center">{error}</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">No matching files found</div>
                    ) : (
                        filteredItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => item.is_dir ? browse(item.path) : setSelectedFile(item.path)}
                                onDoubleClick={() => { if (!item.is_dir) onSelect(item.path); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedFile === item.path
                                        ? "bg-blue-500/15 border border-blue-500/30"
                                        : "hover:bg-white/5 border border-transparent"
                                    }`}
                            >
                                {item.is_dir
                                    ? <Folder size={18} className="text-amber-400 shrink-0" />
                                    : <FileText size={18} className="text-blue-400 shrink-0" />
                                }
                                <span className="flex-1 text-sm text-neutral-200 truncate">{item.name}</span>
                                {!item.is_dir && <span className="text-xs text-neutral-500 shrink-0">{formatSize(item.size)}</span>}
                            </button>
                        ))
                    )}
                </div>

                <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
                    <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                        {selectedFile ? selectedFile.split(/[\\/]/).pop() : "No file selected"}
                    </span>
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-400 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/10">
                            Cancel
                        </button>
                        <button
                            onClick={() => selectedFile && onSelect(selectedFile)}
                            disabled={!selectedFile}
                            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/30"
                        >
                            Select
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
