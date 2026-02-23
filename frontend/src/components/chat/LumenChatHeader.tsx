import { ChatMessage } from "@/components/chat/types";
import { Button } from "@/components/ui/button";

interface LumenChatHeaderProps {
  selectedModel: string;
  isSending: boolean;
  uploadStatus: string | null;
  messages: ChatMessage[];
  onClear: () => void;
}

export function LumenChatHeader({
  selectedModel, isSending, uploadStatus, messages, onClear,
}: LumenChatHeaderProps) {
  return (
    <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between text-[11px] text-neutral-400 font-medium tracking-tight">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
          <span>
            <span className="opacity-60">Model:</span> <span className="text-neutral-200 capitalize">{selectedModel}</span>
          </span>
        </div>
        {isSending && (
          <span className="flex items-center gap-2 text-blue-400">
            <span className="animate-bounce">●</span>
            Thinking…
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {uploadStatus && (
          <span className="text-emerald-400/80 animate-in fade-in slide-in-from-right-2 duration-300">
            {uploadStatus}
          </span>
        )}
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={onClear}
            disabled={isSending}
            className="h-7 px-3 text-[11px] text-neutral-500 hover:text-red-400 hover:bg-red-400/5 transition-all rounded-full"
          >
            Clear History
          </Button>
        )}
      </div>
    </div>
  );
}
