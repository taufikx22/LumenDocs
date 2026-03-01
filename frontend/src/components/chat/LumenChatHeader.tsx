import { ChatMessage } from "@/components/chat/types";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { Button } from "@/components/ui/button";

interface ActiveModel {
  loaded: boolean;
  id?: string;
  name?: string;
}

interface LumenChatHeaderProps {
  activeModel: ActiveModel | null;
  isSending: boolean;
  uploadStatus: string | null;
  messages: ChatMessage[];
  onClear: () => void;
  onSwitchModel: (modelId: string) => Promise<void>;
  onManageModels: () => void;
}

export function LumenChatHeader({
  activeModel, isSending, uploadStatus, messages,
  onClear, onSwitchModel, onManageModels,
}: LumenChatHeaderProps) {
  return (
    <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between text-[11px] text-neutral-400 font-medium tracking-tight">
      <div className="flex items-center gap-4">
        <ModelSelector
          activeModel={activeModel}
          onSwitch={onSwitchModel}
          onManageModels={onManageModels}
        />
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
