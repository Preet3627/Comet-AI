"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { LLMProviderOptions } from '@/lib/llm/providers/base';
import SearchEngineSettings from './SearchEngineSettings';
import ThemeSettings from './ThemeSettings';
import BackendSettings from './BackendSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { OpenAICompatibleProvider } from '@/lib/llm/providers/openai-compatible';
import { useAppStore } from '@/store/useAppStore';
import { Cpu, Cloud, Settings, Save, Shield, Database, ChevronDown, Check, Sparkles, Puzzle, FolderOpen } from 'lucide-react';

interface LLMProviderSettingsProps {
  selectedEngine: string;
  setSelectedEngine: (engine: string) => void;
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  backgroundImage: string;
  setBackgroundImage: (imageUrl: string) => void;
  backend: 'firebase' | 'mysql';
  setBackend: (backend: 'firebase' | 'mysql') => void;
  mysqlConfig: any;
  setMysqlConfig: (config: any) => void;
  ollamaModels: { name: string; modified_at: string; }[];
  setOllamaModels: (models: { name: string; modified_at: string; }[]) => void;
  setError: (error: string | null) => void; // New prop for setting errors
  showSettings: boolean; // New prop for controlling visibility
  setShowSettings: (show: boolean) => void; // New prop for setting visibility
}

const LLMProviderSettings: React.FC<LLMProviderSettingsProps> = (props) => {
  const store = useAppStore();
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [selectedProviderConfig, setSelectedProviderConfig] = useState<LLMProviderOptions>({});
  // const [showSettings, setShowSettings] = useState<boolean>(false); // Removed internal state
  const [feedback, setFeedback] = useState<string | null>(null);

  // Initialize a local instance for Web fallback
  const localProvider = useMemo(() => new OpenAICompatibleProvider(), []);

  useEffect(() => {
    const fetchProviders = async () => {
      if (window.electronAPI) {
        try {
          const availableProviders = await window.electronAPI.getAvailableLLMProviders();
          if (availableProviders && availableProviders.length > 0) {
            setProviders(availableProviders);
            // Default to store value if present, else first provider
            const currentp = store.aiProvider === 'local' ? 'local' : availableProviders[0].id;
            setActiveProviderId(currentp);
            return;
          }
        } catch (e) {
          console.warn("Electron LLM API failed, falling back to local:", e);
        }
      }

      // Exclusive focus on Ollama (Local AI)
      setProviders([
        { id: 'ollama', name: 'Ollama (Local AI Engine)' }
      ]);
      setActiveProviderId('ollama');
    };
    fetchProviders();
  }, [store.aiProvider]);

  const handleProviderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProviderId = e.target.value as any;
    setActiveProviderId(newProviderId);
    store.setAIProvider(newProviderId);
    if (window.electronAPI) {
      await window.electronAPI.setActiveLLMProvider(newProviderId);
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSelectedProviderConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async () => {
    if (!activeProviderId) return;

    let config: LLMProviderOptions = {};
    if (activeProviderId === 'ollama') {
      config = { baseUrl: store.ollamaBaseUrl, model: store.ollamaModel, localLlmMode: store.localLlmMode };
    } else if (activeProviderId === 'google' || activeProviderId === 'google-flash') {
      config = {
        apiKey: store.geminiApiKey,
        model: activeProviderId === 'google-flash' ? 'gemini-3.0-flash' : (store.geminiModel || 'gemini-3.1-flash')
      };
    } else if (activeProviderId === 'openai') {
      config = { apiKey: store.openaiApiKey, model: store.openaiModel || 'gpt-4o' };
    } else if (activeProviderId === 'anthropic') {
      config = { apiKey: store.anthropicApiKey, model: store.anthropicModel || 'claude-3-5-sonnet-latest' };
    } else if (activeProviderId === 'xai') {
      config = { apiKey: (store as any).xaiApiKey, model: (store as any).xaiModel || 'grok-2-latest' };
    } else if (activeProviderId === 'groq') {
      config = { apiKey: store.groqApiKey, model: (store as any).groqModel || 'llama-3.3-70b-versatile' };
    }

    if (window.electronAPI) {
      const success = await window.electronAPI.configureLLMProvider(activeProviderId, config);
      setFeedback(success ? 'Intelligence Configured' : 'Configuration Failed');
    } else {
      setFeedback('Local IQ Active');
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden glass-dark transition-all">
      <AnimatePresence>
        {props.showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden" // Removed border-t to let the parent AIChatSidebar handle it
          >
            <div className="p-4 space-y-6 custom-scrollbar max-h-[450px] overflow-y-auto">
              <ThemeSettings {...props} />
              <SearchEngineSettings {...props} />
              <BackendSettings {...props} />

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud size={12} className="text-deep-space-accent-neon" />
                  <label htmlFor="ai-orchestration-select" className="block text-[10px] uppercase font-black tracking-widest text-white/40">AI Orchestration</label>
                </div>

                <select
                  id="ai-orchestration-select"
                  aria-label="AI Orchestration Provider Selection"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-deep-space-accent-neon/50 transition-all font-bold"
                  value={activeProviderId || ''}
                  onChange={handleProviderChange}
                >
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">MCP Server Settings</p>
                  <div className="space-y-1">
                    <label className="text-[9px] text-white/30 uppercase font-bold">MCP Server Port</label>
                    <input
                      type="number"
                      placeholder="e.g. 3001"
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                      value={store.mcpServerPort || ''}
                      onChange={(e) => {
                        const newPort = parseInt(e.target.value, 10);
                        if (!isNaN(newPort)) {
                          store.setMcpServerPort(newPort);
                          // Send update to main process to restart server if needed, or just update port variable
                          if (window.electronAPI) {
                            window.electronAPI.setMcpServerPort(newPort);
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={12} className="text-deep-space-accent-neon" />
                    <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Additional AI Instructions</label>
                  </div>
                  <textarea
                    placeholder="Enter persistent instructions for the AI (e.g., 'Always respond in markdown and act as a pirate')."
                    className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none h-24 resize-none"
                    value={store.additionalAIInstructions}
                    onChange={(e) => store.setAdditionalAIInstructions(e.target.value)}
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="space-y-4">
                    {activeProviderId === 'ollama' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-deep-space-accent-neon mb-1">
                          <Cpu size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-deep-space-accent-neon">Native Ollama Models</span>
                        </div>

                        {/* Base URL Input */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">Base URL (Remote / Local)</label>
                          <input
                            type="text"
                            placeholder="e.g. http://localhost:11434"
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={store.ollamaBaseUrl || ''}
                            onChange={(e) => store.setOllamaBaseUrl(e.target.value)}
                          />
                        </div>

                        {/* Model Selection Dropdown */}
                        <div className="space-y-1">
                          <label htmlFor="ollama-model-select" className="text-[9px] text-white/30 uppercase font-bold">Select Active Model</label>
                          <select
                            id="ollama-model-select"
                            aria-label="Ollama Model Selection"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-deep-space-accent-neon/50 transition-all font-bold"
                            value={store.ollamaModel}
                            onChange={async (e) => {
                              const newModel = e.target.value;
                              store.setOllamaModel(newModel);
                              if (window.electronAPI && newModel !== 'custom') {
                                // Auto-sync configuration to main process
                                await window.electronAPI.configureLLMProvider('ollama', {
                                  baseUrl: store.ollamaBaseUrl,
                                  model: newModel
                                });
                                setFeedback(`Synced: ${newModel}`);
                                setTimeout(() => setFeedback(null), 2000);
                              }
                            }}
                            onFocus={async () => {
                              if (window.electronAPI) {
                                setFeedback("Syncing Models...");
                                const { models, error } = await window.electronAPI.ollamaListModels();
                                if (models) {
                                  props.setOllamaModels(models);
                                  setFeedback(null);
                                } else if (error) {
                                  props.setError(`Ollama error: ${error}`);
                                  setFeedback("Sync Failed");
                                }
                              }
                            }}
                          >
                            {props.ollamaModels.length > 0 ? (
                              props.ollamaModels.map((model) => (
                                <option key={model.name} value={model.name}>{model.name} ({model.modified_at})</option>
                              ))
                            ) : (
                              <option value="">No Ollama models found</option>
                            )}
                            <option value="custom">Custom (Type below)</option>
                          </select>
                        </div>

                        {/* Manual Override */}
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Or type model name..."
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white outline-none italic"
                            value={store.ollamaModel || ''}
                            onChange={(e) => store.setOllamaModel(e.target.value)}
                          />
                        </div>

                        {/* Local LLM Mode Selection */}
                        <div className="space-y-1">
                          <label htmlFor="local-mode-select" className="text-[9px] text-white/30 uppercase font-bold">Local intelligence Intensity</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['light', 'normal', 'heavy'] as const).map((m) => (
                              <button
                                key={m}
                                onClick={() => store.setLocalLlmMode(m)}
                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all border ${store.localLlmMode === m
                                  ? 'bg-deep-space-accent-neon/20 border-deep-space-accent-neon/50 text-deep-space-accent-neon'
                                  : 'bg-black/20 border-white/5 text-white/40 hover:text-white/60'
                                  }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                          <p className="text-[8px] text-white/20 italic pt-1">
                            {store.localLlmMode === 'light' && 'Optimized for speed. Uses smaller, efficient models.'}
                            {store.localLlmMode === 'normal' && 'Balanced performance. Good for most daily tasks.'}
                            {store.localLlmMode === 'heavy' && 'Max reasoning. Recommended for coding and analysis.'}
                          </p>
                        </div>

                        {/* Terminal & Pull Section */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5 mt-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] text-white/30 uppercase font-bold">Install New Model</p>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Model Name (e.g. gemma:2b)"
                              className="flex-1 bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white outline-none"
                              id="ollama-pull-input"
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById('ollama-pull-input') as HTMLInputElement;
                                const model = input.value.trim();
                                if (!model || !window.electronAPI) return;

                                const outputDiv = document.getElementById('ollama-terminal');
                                if (outputDiv) outputDiv.innerText = `> Initializing pull for ${model}...\n`;

                                window.electronAPI.pullOllamaModel(model, (data: any) => {
                                  if (outputDiv) {
                                    if (data.done) {
                                      outputDiv.innerText += `\n> DONE: ${model} installed successfully.\n`;
                                    } else {
                                      if (data.output.includes('%') || data.output.includes('[')) {
                                        const lines = outputDiv.innerText.split('\n');
                                        if (lines.length > 0 && (lines[lines.length - 1].includes('%') || lines[lines.length - 1].includes('['))) lines.pop();
                                        outputDiv.innerText = lines.join('\n') + '\n' + data.output.trim();
                                      } else {
                                        outputDiv.innerText += data.output;
                                      }
                                      outputDiv.scrollTop = outputDiv.scrollHeight;
                                    }
                                  }
                                });
                              }}
                              className="px-3 py-1 bg-deep-space-accent-neon/10 hover:bg-deep-space-accent-neon/20 text-deep-space-accent-neon text-[10px] font-black uppercase rounded-lg transition-all"
                            >
                              PULL
                            </button>
                          </div>
                          <div id="ollama-terminal" className="h-[60px] bg-black/40 rounded-lg p-2 text-[9px] font-mono text-green-400/80 overflow-y-auto whitespace-pre-wrap border border-white/5 custom-scrollbar">
                            Ready to install models from ollama.com/library
                          </div>
                        </div>

                        {/* Import Local GGUF */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5 mt-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] text-white/30 uppercase font-bold">Import Custom Model (.GGUF)</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                if (!window.electronAPI) return;
                                const filePath = await window.electronAPI.selectLocalFile();
                                if (filePath) {
                                  // Simple generic prompt for name - in a real app would be a modal
                                  const name = prompt("Enter a name for this model (e.g. my-custom-model):");
                                  if (name) {
                                    const outputDiv = document.getElementById('ollama-terminal');
                                    if (outputDiv) outputDiv.innerText += `\n> Importing ${name} from local file...\n`;

                                    const res = await window.electronAPI.importOllamaModel({ modelName: name, filePath });
                                    if (outputDiv) {
                                      if (res.success) {
                                        outputDiv.innerText += `> SUCCESS: Model '${name}' created.\n`;
                                        store.setOllamaModel(name);
                                      } else {
                                        outputDiv.innerText += `> ERROR: ${res.error}\n`;
                                      }
                                      outputDiv.scrollTop = outputDiv.scrollHeight;
                                    }
                                  }
                                }
                              }}
                              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-white/60 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
                            >
                              <Database size={12} />
                              Select .GGUF File
                            </button>
                          </div>
                        </div>

                        <p className="text-[9px] text-green-400/60 font-medium pt-2">
                          * Native backend running. Models stored in local user data.
                        </p>
                      </div>
                    )}

                    {(activeProviderId === 'google' || activeProviderId === 'google-flash') && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-deep-space-accent-neon mb-1">
                          <Sparkles size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-deep-space-accent-neon">
                            {activeProviderId === 'google-flash' ? 'Google Gemini 3.0 Flash' : 'Google Gemini'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">API Key</label>
                          <input
                            type="password"
                            placeholder="Enter Gemini API Key..."
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={store.geminiApiKey || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => store.setGeminiApiKey(e.target.value)}
                          />
                        </div>
                        {activeProviderId !== 'google-flash' && (
                          <div className="space-y-1">
                            <label className="text-[9px] text-white/30 uppercase font-bold">Model Override</label>
                            <input
                              type="text"
                              placeholder="e.g. gemini-3.1-flash"
                              className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                              value={store.geminiModel || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => store.setGeminiModel(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {activeProviderId === 'openai' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-deep-space-accent-neon mb-1">
                          <Cloud size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-deep-space-accent-neon">OpenAI (GPT-4o/o1)</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">API Key</label>
                          <input
                            type="password"
                            placeholder="sk-..."
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={store.openaiApiKey || ''}
                            onChange={(e) => store.setOpenaiApiKey(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">Model</label>
                          <input
                            type="text"
                            placeholder="e.g. gpt-4o"
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={store.openaiModel || ''}
                            onChange={(e) => store.setOpenaiModel(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {activeProviderId === 'anthropic' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-deep-space-accent-neon mb-1">
                          <Shield size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-deep-space-accent-neon">Anthropic Claude</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">API Key</label>
                          <input
                            type="password"
                            placeholder="sk-ant-..."
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={store.anthropicApiKey || ''}
                            onChange={(e) => store.setAnthropicApiKey(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">Model</label>
                          <input
                            type="text"
                            placeholder="e.g. claude-3-5-sonnet-latest"
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={store.anthropicModel || ''}
                            onChange={(e) => store.setAnthropicModel(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {activeProviderId === 'xai' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-deep-space-accent-neon mb-1">
                          <Cloud size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-deep-space-accent-neon">xAI Grok</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">API Key</label>
                          <input
                            type="password"
                            placeholder="xai-..."
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={(store as any).xaiApiKey || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => (store as any).setXaiApiKey(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">Model</label>
                          <input
                            type="text"
                            placeholder="e.g. grok-2-latest"
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={(store as any).xaiModel || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => (store as any).setXaiModel(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {activeProviderId === 'groq' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-deep-space-accent-neon mb-1">
                          <Cpu size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-deep-space-accent-neon">Groq (LPU)</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">API Key</label>
                          <input
                            type="password"
                            placeholder="gsk_..."
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={store.groqApiKey || ''}
                            onChange={(e) => store.setGroqApiKey(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-white/30 uppercase font-bold">Model</label>
                          <input
                            type="text"
                            placeholder="e.g. llama-3.3-70b-versatile"
                            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-white/10 outline-none"
                            value={store.groqModel || ''}
                            onChange={(e) => store.setGroqModel(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSaveConfig}
                    className="w-full mt-4 py-3 bg-deep-space-accent-neon/10 border border-deep-space-accent-neon/20 hover:bg-deep-space-accent-neon/20 text-deep-space-accent-neon text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={12} />
                    {feedback || 'Save Intelligence Config'}
                  </button>
                </div>
              </div>

              {/* Password Manager Mini Entry (Quick Access) */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={12} className="text-white/40" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Vault Status</span>
                </div>
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Secure</span>
              </div>

              {/* Extensions Directory */}
              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Puzzle size={12} className="text-deep-space-accent-neon" />
                  <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Extensions</label>
                </div>
                <button
                  onClick={() => {
                    if (window.electronAPI) {
                      window.electronAPI.openExtensionDir();
                    }
                  }}
                  className="w-full mt-2 py-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <FolderOpen size={12} />
                  Open Extensions Directory
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LLMProviderSettings;