"use client";

import { useState, useRef, useEffect } from "react";

import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { LumenChatHeader } from "@/components/chat/LumenChatHeader";
import { LumenChatMessages } from "@/components/chat/LumenChatMessages";
import { LumenChatInput } from "@/components/chat/LumenChatInput";
import type { ChatMessage } from "@/components/chat/types";
import { LumenSidebar, type Session } from "@/components/chat/LumenSidebar";
import { Menu } from "lucide-react";

export default function RuixenMoonChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel] = useState<string>("local");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 120,
    maxHeight: 250,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/rag/sessions");
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleSelectSession = async (id: string) => {
    if (isSending) return;
    setCurrentSessionId(id);
    setIsSidebarOpen(false);
    setError(null);
    setMessages([]);

    try {
      const res = await fetch(`/api/rag/sessions/${id}`);
      if (!res.ok) throw new Error("Failed to load session");
      const data = await res.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages(data.map((msg: any) => ({
        id: crypto.randomUUID(),
        role: msg.role,
        content: msg.content,
        modelType: msg.model_type,
      })));
    } catch (err) {
      console.error(err);
      setError("Could not load session history.");
    }
  };

  const handleNewSession = () => {
    if (isSending) return;
    setCurrentSessionId(null);
    setMessages([]);
    setIsSidebarOpen(false);
    setError(null);
  };

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    adjustHeight(true);

    try {
      const response = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage.content,
          top_k: 5,
          model: selectedModel,
          session_id: currentSessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || data?.detail || "Failed to get a response.");
        return;
      }

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer ?? "No answer returned.",
        modelType: data.model_type ?? data.modelType ?? selectedModel,
        context: data.context ?? null,
      }]);

      void fetchSessions();
    } catch (err) {
      console.error(err);
      setError("Unexpected error while contacting the backend.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileButtonClick = () => fileInputRef.current?.click();

  const handleFilesSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadStatus(null);
    setError(null);

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/rag/ingest", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || data?.detail || "Failed to ingest documents.");
        setUploadStatus("Upload failed");
        return;
      }

      const processed = data.processed_documents ?? data.processedDocuments ?? 0;
      const chunks = data.total_chunks ?? data.totalChunks ?? 0;
      setUploadStatus(`Uploaded ${processed} document${processed === 1 ? "" : "s"} (${chunks} chunks).`);
    } catch (err) {
      console.error(err);
      setError("Unexpected error while uploading documents.");
      setUploadStatus("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const inputProps = {
    message,
    isSending,
    uploading,
    onChangeMessage: (value: string) => { setMessage(value); adjustHeight(); },
    onSend: handleSend,
    onFilesSelected: handleFilesSelected,
    onFileButtonClick: handleFileButtonClick,
    textareaRef,
    onKeyDown: handleKeyDown,
  };

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center flex flex-col items-center overflow-x-hidden"
      style={{ backgroundImage: "url('/ruixen_moon_2.png')", backgroundAttachment: "fixed" }}
    >
      <LumenSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="absolute top-6 left-6 z-30">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2.5 bg-black/40 backdrop-blur-md text-white rounded-xl border border-white/10 hover:bg-black/60 transition-all shadow-xl group"
        >
          <Menu size={22} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center pb-[10vh]">
          <div className="text-center px-4 mb-8">
            <h1 className="text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-default">
              LumenDocs
            </h1>
            <p className="mt-5 text-white max-w-xl mx-auto text-[15px] leading-relaxed font-medium cursor-default">
              Next-generation document intelligence powered by <span className="bg-white text-sky-300 font-extrabold px-2.5 py-0.5 rounded-full mx-1 shadow-[0_0_15px_rgba(255,255,255,0.6)]">Local LLMs</span>.
              Instant citations, deep context, and complete privacy.
            </p>
          </div>

          <div className="w-full max-w-3xl px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="relative bg-black/40 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden transition-all hover:border-white/20 hover:bg-black/50">
              {error && (
                <div className="px-4 py-2 text-xs text-red-300 border-b border-red-900/60 bg-red-950/30">
                  {error}
                </div>
              )}
              <LumenChatInput {...inputProps} />
            </div>

            <div className="flex items-center justify-center flex-wrap gap-4 mt-8 text-[11px] uppercase tracking-[0.25em] font-black text-neutral-500/50 select-none">
              <span>SECURE</span>
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
              <span>LOCAL-FIRST</span>
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
              <span>PRIVACY-DRIVEN</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full flex flex-col items-center pt-24 pb-6 px-4 sm:px-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-full max-w-5xl flex-1 relative bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/10 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-[85vh]">
            <LumenChatHeader
              selectedModel={selectedModel}
              isSending={isSending}
              uploadStatus={uploadStatus}
              messages={messages}
              onClear={handleNewSession}
            />

            <LumenChatMessages messages={messages} messagesEndRef={messagesEndRef} />

            {error && (
              <div className="px-4 py-2 text-xs text-red-300 border-t border-red-900/60 bg-red-950/30">
                {error}
              </div>
            )}

            <LumenChatInput {...inputProps} />
          </div>
        </div>
      )}
    </div>
  );
}
