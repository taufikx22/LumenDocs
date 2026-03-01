import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/components/chat/types";
import { Cpu, ArrowRightLeft } from "lucide-react";

interface LumenChatMessagesProps {
  messages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function LumenChatMessages({ messages, messagesEndRef }: LumenChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-3">
      {messages.map((msg) => {
        // Model switch system message
        if (msg.role === "system") {
          return (
            <div key={msg.id} className="flex justify-center py-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] text-neutral-400">
                <ArrowRightLeft className="w-3 h-3" />
                {msg.content}
              </div>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-xs shadow-sm",
                msg.role === "user"
                  ? "bg-sky-600 text-white"
                  : "bg-neutral-800/80 text-neutral-50 border border-neutral-700/60",
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
              {msg.role === "assistant" && (
                <div className="mt-2 flex flex-col gap-1">
                  {msg.modelName && (
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                      <Cpu className="w-3 h-3" />
                      <span className="uppercase tracking-wide">{msg.modelName}</span>
                    </div>
                  )}
                  {msg.context && (
                    <details className="text-[10px] text-neutral-400/90">
                      <summary className="cursor-pointer select-none hover:text-neutral-200">
                        View context used
                      </summary>
                      <p className="mt-1 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                        {msg.context}
                      </p>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
