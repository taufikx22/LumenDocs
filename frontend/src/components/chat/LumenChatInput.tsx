import { ChangeEventHandler, KeyboardEventHandler } from "react";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, Plus, Loader2 } from "lucide-react";

interface LumenChatInputProps {
  message: string;
  isSending: boolean;
  uploading: boolean;
  onChangeMessage: (value: string) => void;
  onSend: () => void;
  onFilesSelected: ChangeEventHandler<HTMLInputElement>;
  onFileButtonClick: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
}

export function LumenChatInput({
  message, isSending, uploading,
  onChangeMessage, onSend, onFilesSelected, onFileButtonClick,
  textareaRef, onKeyDown,
}: LumenChatInputProps) {
  return (
    <div className="border-t border-white/5 bg-black/20 p-4">
      <div className="relative flex flex-col bg-white/5 border border-white/10 rounded-2xl transition-all focus-within:border-blue-500/50 focus-within:bg-white/[0.08] shadow-2xl">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => onChangeMessage(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about your documents..."
          className={cn(
            "w-full px-5 pt-4 pb-14 resize-none border-none",
            "bg-transparent text-white text-[15px] leading-relaxed",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-neutral-500 min-h-[120px] custom-scrollbar text-lg",
          )}
          style={{ overflow: "hidden" }}
          disabled={isSending}
        />

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 transition-all bg-white/5 border border-white/5"
              onClick={onFileButtonClick}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              ) : (
                <Plus className="w-5 h-5 text-neutral-300" />
              )}
            </Button>

            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.html,.txt"
              className="hidden"
              onChange={onFilesSelected}
            />

            {uploading && (
              <span className="text-xs text-blue-400 font-medium animate-pulse bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                Uploading...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <Button
              type="button"
              onClick={onSend}
              disabled={isSending || !message.trim()}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all h-10 font-medium active:scale-95",
                isSending || !message.trim()
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40",
              )}
            >
              {isSending ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="animate-spin w-3 h-3 border-2 border-white/20 border-t-white rounded-full" />
                  Sending
                </span>
              ) : (
                <>
                  <span className="text-xs font-bold uppercase tracking-widest">Send</span>
                  <ArrowUpIcon className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
