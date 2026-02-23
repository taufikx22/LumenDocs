import { X, Plus, MessageSquare } from "lucide-react";

export interface Session {
    session_id: string;
    title: string;
    updated_at: string;
}

interface LumenSidebarProps {
    sessions: Session[];
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewSession: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

export function LumenSidebar({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewSession,
    isOpen,
    onToggle
}: LumenSidebarProps) {
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
        fixed top-4 left-4 h-[calc(100%-2rem)] bg-black/70 backdrop-blur-2xl border border-white/10 
        w-72 z-50 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col rounded-2xl shadow-2xl
        ${isOpen ? "translate-x-0 opacity-100 scale-100" : "-translate-x-full opacity-0 scale-95 pointer-events-none"}
      `}>
                <div className="p-5 flex items-center justify-between border-b border-white/5">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                        <MessageSquare size={18} className="text-blue-400" />
                        History
                    </h2>
                    <button
                        onClick={onToggle}
                        className="text-neutral-500 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4">
                    <button
                        onClick={onNewSession}
                        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl border border-white/5 transition-all text-sm font-medium hover:scale-[1.02] active:scale-95"
                    >
                        <Plus size={16} />
                        New Session
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-2 custom-scrollbar">
                    {sessions.length === 0 ? (
                        <div className="text-center text-neutral-500 text-xs mt-12 px-4 italic">
                            Your previous conversations will appear here.
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <button
                                key={session.session_id}
                                onClick={() => onSelectSession(session.session_id)}
                                className={`w-full text-left px-4 py-3.5 rounded-xl flex flex-col gap-1 transition-all border
                  ${currentSessionId === session.session_id
                                        ? "bg-white/10 border-white/10 text-white shadow-lg shadow-black/20"
                                        : "text-neutral-400 border-transparent hover:bg-white/5 hover:text-white"
                                    }
                `}
                            >
                                <div className="truncate text-sm font-medium">{session.title}</div>
                                <div className="text-[10px] opacity-40 uppercase tracking-wider font-bold">
                                    {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
