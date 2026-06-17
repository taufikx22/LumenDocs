"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X, Key, Brain, Sliders, Loader2, CheckCircle2,
  AlertCircle, Eye, EyeOff, Save, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

interface SettingsData {
  openai_api_key: string | null;
  google_api_key: string | null;
  anthropic_api_key: string | null;
  openai_configured: boolean;
  google_configured: boolean;
  anthropic_configured: boolean;
  system_prompt: string;
  user_instructions: string;
  default_temperature: number;
  default_max_tokens: number;
  default_context_size: number;
}

type TabId = "api-keys" | "instructions" | "model-defaults";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "api-keys", label: "API Keys", icon: <Key className="w-4 h-4" /> },
  { id: "instructions", label: "Instructions", icon: <Brain className="w-4 h-4" /> },
  { id: "model-defaults", label: "Defaults", icon: <Sliders className="w-4 h-4" /> },
];

export function SettingsPanel({ isOpen, onClose, onSettingsSaved }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("api-keys");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable fields
  const [openaiKey, setOpenaiKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userInstructions, setUserInstructions] = useState("");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [contextSize, setContextSize] = useState(4096);

  // Key visibility
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  // Key test state
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { valid: boolean; message: string }>>({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/settings"));
      if (!res.ok) throw new Error("Failed to load settings");
      const data: SettingsData = await res.json();
      setSettings(data);
      setSystemPrompt(data.system_prompt || "");
      setUserInstructions(data.user_instructions || "");
      setTemperature(data.default_temperature);
      setMaxTokens(data.default_max_tokens);
      setContextSize(data.default_context_size);
      // Don't pre-fill masked keys
      setOpenaiKey("");
      setGoogleKey("");
      setAnthropicKey("");
    } catch (err) {
      console.error(err);
      setError("Could not load settings from the backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setError(null);
      setSuccess(null);
      setTestResult({});
    }
  }, [isOpen, fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Build payload — only include changed fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {};

      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();
      if (googleKey.trim()) payload.google_api_key = googleKey.trim();
      if (anthropicKey.trim()) payload.anthropic_api_key = anthropicKey.trim();

      if (activeTab === "instructions" || systemPrompt !== (settings?.system_prompt || "")) {
        payload.system_prompt = systemPrompt;
      }
      if (activeTab === "instructions" || userInstructions !== (settings?.user_instructions || "")) {
        payload.user_instructions = userInstructions;
      }

      payload.default_temperature = temperature;
      payload.default_max_tokens = maxTokens;
      payload.default_context_size = contextSize;

      const res = await fetch(getApiUrl("/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to save settings");
      }

      setSuccess("Settings saved successfully!");
      await fetchSettings();
      onSettingsSaved?.();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async (provider: string, key: string) => {
    if (!key.trim()) return;
    setTestingKey(provider);
    setTestResult((prev) => ({ ...prev, [provider]: undefined as unknown as { valid: boolean; message: string } }));

    try {
      const res = await fetch(getApiUrl("/settings/test-key"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: key.trim() }),
      });
      const data = await res.json();
      setTestResult((prev) => ({ ...prev, [provider]: data }));
    } catch {
      setTestResult((prev) => ({ ...prev, [provider]: { valid: false, message: "Connection failed" } }));
    } finally {
      setTestingKey(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl mx-4 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center border border-violet-500/20">
              <Sliders className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-6 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-[1px] ${
                activeTab === tab.id
                  ? "border-violet-500 text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-2.5 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/20 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 text-sm rounded-lg border border-emerald-500/20 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading settings...</p>
            </div>
          ) : (
            <>
              {/* ── API Keys Tab ── */}
              {activeTab === "api-keys" && (
                <div className="space-y-5">
                  <p className="text-sm text-neutral-400 mb-4">
                    Add API keys to enable cloud model providers. Keys are stored locally in your backend config.
                  </p>

                  {/* OpenAI */}
                  <ApiKeyField
                    label="OpenAI API Key"
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={setOpenaiKey}
                    configured={settings?.openai_configured || false}
                    maskedKey={settings?.openai_api_key ?? null}
                    show={showOpenai}
                    onToggleShow={() => setShowOpenai(!showOpenai)}
                    testing={testingKey === "openai"}
                    testResult={testResult["openai"]}
                    onTest={() => handleTestKey("openai", openaiKey)}
                    accent="emerald"
                  />

                  {/* Google/Gemini */}
                  <ApiKeyField
                    label="Google (Gemini) API Key"
                    placeholder="AIza..."
                    value={googleKey}
                    onChange={setGoogleKey}
                    configured={settings?.google_configured || false}
                    maskedKey={settings?.google_api_key ?? null}
                    show={showGoogle}
                    onToggleShow={() => setShowGoogle(!showGoogle)}
                    testing={testingKey === "google"}
                    testResult={testResult["google"]}
                    onTest={() => handleTestKey("google", googleKey)}
                    accent="blue"
                  />

                  {/* Anthropic/Claude */}
                  <ApiKeyField
                    label="Anthropic (Claude) API Key"
                    placeholder="sk-ant-..."
                    value={anthropicKey}
                    onChange={setAnthropicKey}
                    configured={settings?.anthropic_configured || false}
                    maskedKey={settings?.anthropic_api_key ?? null}
                    show={showAnthropic}
                    onToggleShow={() => setShowAnthropic(!showAnthropic)}
                    testing={testingKey === "anthropic"}
                    testResult={testResult["anthropic"]}
                    onTest={() => handleTestKey("anthropic", anthropicKey)}
                    accent="orange"
                  />
                </div>
              )}

              {/* ── Instructions Tab ── */}
              {activeTab === "instructions" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      System Prompt
                    </label>
                    <p className="text-xs text-neutral-500 mb-2">
                      The base instruction given to the AI model. Controls its personality and behavior.
                    </p>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={5}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 resize-y transition-all"
                      placeholder="You are a helpful AI assistant..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      User-Specific Instructions
                    </label>
                    <p className="text-xs text-neutral-500 mb-2">
                      Additional context or rules. These are appended to the system prompt for every query.
                    </p>
                    <textarea
                      value={userInstructions}
                      onChange={(e) => setUserInstructions(e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 resize-y transition-all"
                      placeholder="Always respond in formal English. Cite sources when possible..."
                    />
                  </div>
                </div>
              )}

              {/* ── Model Defaults Tab ── */}
              {activeTab === "model-defaults" && (
                <div className="space-y-6">
                  <p className="text-sm text-neutral-400 mb-4">
                    Configure default generation parameters used when querying models.
                  </p>

                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-neutral-300">Temperature</label>
                      <span className="text-xs text-violet-400 font-mono bg-violet-500/10 px-2 py-0.5 rounded-md">
                        {temperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                      <span>Precise (0)</span>
                      <span>Creative (1)</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Max Tokens</label>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      max={32768}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Maximum number of tokens in the response (1–32768)</p>
                  </div>

                  {/* Context Size */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Context Window Size</label>
                    <select
                      value={contextSize}
                      onChange={(e) => setContextSize(parseInt(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                    >
                      <option value={2048}>2,048 tokens</option>
                      <option value={4096}>4,096 tokens</option>
                      <option value={8192}>8,192 tokens</option>
                      <option value={16384}>16,384 tokens</option>
                      <option value={32768}>32,768 tokens</option>
                    </select>
                    <p className="text-xs text-neutral-500 mt-1">Controls how much context the GGUF model can process at once</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            onClick={() => {
              fetchSettings();
              setError(null);
              setSuccess(null);
            }}
            className="text-neutral-400 hover:text-white text-sm"
            disabled={loading || saving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-violet-600 text-white hover:bg-violet-500 rounded-xl px-6 h-10 text-sm font-medium transition-all shadow-lg shadow-violet-900/30"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Helper: API Key Field ──────────────────────────────────────── */

interface ApiKeyFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  configured: boolean;
  maskedKey: string | null;
  show: boolean;
  onToggleShow: () => void;
  testing: boolean;
  testResult?: { valid: boolean; message: string };
  onTest: () => void;
  accent: "emerald" | "blue" | "orange";
}

function ApiKeyField({
  label, placeholder, value, onChange,
  configured, maskedKey,
  show, onToggleShow,
  testing, testResult, onTest,
  accent,
}: ApiKeyFieldProps) {

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${configured ? "bg-emerald-400" : "bg-neutral-600"}`} />
          <span className="text-sm font-medium text-neutral-200">{label}</span>
        </div>
        {configured && (
          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold uppercase tracking-wider">
            Configured
          </span>
        )}
      </div>

      {configured && maskedKey && !value && (
        <p className="text-xs text-neutral-500 mb-2 font-mono">{maskedKey}</p>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={configured ? "Enter new key to replace..." : placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 pr-9 transition-all"
          />
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <Button
          variant="ghost"
          onClick={onTest}
          disabled={testing || !value.trim()}
          className="text-xs text-neutral-400 hover:text-white border border-white/10 rounded-lg px-3 shrink-0"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
        </Button>
      </div>

      {testResult && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs ${testResult.valid ? "text-emerald-400" : "text-red-400"}`}>
          {testResult.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {testResult.message}
        </div>
      )}
    </div>
  );
}
