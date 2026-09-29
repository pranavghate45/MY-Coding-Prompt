"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, Plus, UserPlus, ChevronDown, Check, Paperclip, HardDrive, Camera, Code2, X, Download, Terminal, Copy, Zap, Coins, Layers, Sparkles, Swords, History, GitBranch, Lock, Store, Gift, Play, Sliders, Command } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import { TelemetryData, PersonaType } from "@/types/api";
import { PromptArena } from "@/components/PromptArena";
import { PromptVersionHistory } from "@/components/PromptVersionHistory";
import { VaultSettings } from "@/components/VaultSettings";
import { PromptLinter } from "@/components/PromptLinter";
import { LiveCodeSandbox } from "@/components/LiveCodeSandbox";
import { PromptWorkflowRunner } from "@/components/PromptWorkflowRunner";
import { ReferralDashboard } from "@/components/ReferralDashboard";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsHelpModal } from "@/components/ShortcutsHelpModal";
import { VariablePromptModal } from "@/components/VariablePromptModal";
import { SuperPromptStudio } from "@/components/SuperPromptStudio";
import { PromptDoctorModal } from "@/components/PromptDoctorModal";
import { ReversePromptModal } from "@/components/ReversePromptModal";
import { PromptRedTeamModal } from "@/components/PromptRedTeamModal";
import { PromptFeedbackWidget } from "@/components/PromptFeedbackWidget";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Stethoscope, RotateCcw, ShieldAlert } from "lucide-react";




type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type BackendModel = {
  id: string;
  name: string;
  multiplier: number;
};

type ComposerAttachment = {
  id: string;
  name: string;
  sizeLabel: string;
  content?: string | null;
  mime?: string | null;
  isDrive?: boolean;
};

type Message = {
  id: string;
  text: string;
  ts: number;
  telemetry?: TelemetryData;
};

const fallbackModels: BackendModel[] = [
  { id: "gpt-4.1", name: "Model A", multiplier: 0 },
  { id: "gpt-4o", name: "Model B", multiplier: 0 },
  { id: "gemini-2.0-pro", name: "Model C", multiplier: 1 },
  { id: "sonar-pro", name: "Model D", multiplier: 1 },
  { id: "claude-3.7", name: "Model E", multiplier: 1 },
];

import { saveUniversalProject } from "@/lib/projectStore";

export function ChatWorkspace({ publicMode }: { publicMode?: boolean }) {
  const { plan, user } = useAuth();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [models, setModels] = useState<BackendModel[]>(fallbackModels);
  const [selectedModelId, setSelectedModelId] = useState("auto");
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>("Architect");
  const [activeTab, setActiveTab] = useState<"workspace" | "arena">("workspace");
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isLinterOpen, setIsLinterOpen] = useState(false);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  const [isSuperPromptStudioOpen, setIsSuperPromptStudioOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isReverseOpen, setIsReverseOpen] = useState(false);
  const [isRedTeamOpen, setIsRedTeamOpen] = useState(false);
  const [variableModalTemplate, setVariableModalTemplate] = useState("");
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [discountText, setDiscountText] = useState("10% discount");
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [isDragOverComposer, setIsDragOverComposer] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Global Keyboard Shortcuts Hook (Cmd+K, ?, Esc, Cmd+Shift+C, Cmd+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Esc -> Close Modals
      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
        setIsShortcutsHelpOpen(false);
        setIsVariableModalOpen(false);
        setIsVersionHistoryOpen(false);
        setIsVaultOpen(false);
        setIsLinterOpen(false);
        setIsWorkflowOpen(false);
        setIsReferralOpen(false);
        setSandboxCode(null);
        return;
      }

      // Cmd+Shift+C -> Quick Copy latest AI response
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        const lastAssistantMsg = [...messages].reverse().find((m) => !m.id.startsWith("m-user"));
        if (lastAssistantMsg) {
          navigator.clipboard.writeText(lastAssistantMsg.text);
          setCopiedMessageId(`md-${lastAssistantMsg.id}`);
          setTimeout(() => setCopiedMessageId(null), 2000);
        }
        return;
      }

      // Cmd+B -> Toggle Live Sandbox
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        const lastAssistantMsg = [...messages].reverse().find((m) => !m.id.startsWith("m-user"));
        if (lastAssistantMsg) {
          setSandboxCode((prev) => (prev ? null : lastAssistantMsg.text));
        }
        return;
      }

      // ? Key -> Open Keyboard Shortcuts Help (ignore when typing in form controls)
      const target = e.target as HTMLElement | null;
      const isInput = target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [messages]);

  const handlePaletteTriggerAction = (actionId: string) => {
    if (actionId === "open-super-prompt-studio") setIsSuperPromptStudioOpen(true);
    if (actionId === "open-prompt-doctor") setIsDoctorOpen(true);
    if (actionId === "open-reverse-prompt") setIsReverseOpen(true);
    if (actionId === "open-redteam-test") setIsRedTeamOpen(true);
    if (actionId === "open-arena") setActiveTab("arena");
    if (actionId === "open-vault") setIsVaultOpen(true);
    if (actionId === "open-workflows") setIsWorkflowOpen(true);
    if (actionId === "open-versions") setIsVersionHistoryOpen(true);
    if (actionId === "run-lint") setIsLinterOpen(true);
    if (actionId === "open-shortcuts-help") setIsShortcutsHelpOpen(true);
    if (actionId === "toggle-sandbox") {
      const last = [...messages].reverse().find((m) => !m.id.startsWith("m-user"));
      if (last) setSandboxCode((prev) => (prev ? null : last.text));
    }
    if (actionId === "export-zip") {
      const last = [...messages].reverse().find((m) => !m.id.startsWith("m-user"));
      if (last) handleDownloadZip(last.text, last.id);
    }
    if (actionId === "copy-curl") {
      const last = [...messages].reverse().find((m) => !m.id.startsWith("m-user"));
      if (last) handleCopyCurl(last.text, last.id);
    }
    if (actionId === "template-fullstack") {
      const tpl = "Build a full-stack {{component_name:Authentication Dashboard}} component using {{framework:Next.js 16}} with state management via {{state_management:Zustand}} connecting to endpoint {{api_endpoint:/api/auth/login}}.";
      setVariableModalTemplate(tpl);
      setIsVariableModalOpen(true);
    }
    if (actionId === "template-api-router") {
      const tpl = "Write a typed FastAPI router named {{router_name:user_routes}} implementing {{http_method:POST}} endpoint for schema {{response_schema:UserRegistrationResponse}}.";
      setVariableModalTemplate(tpl);
      setIsVariableModalOpen(true);
    }
  };

  const handleDownloadZip = async (text: string, msgId: string) => {
    try {
      setExportingId(msgId);
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/api/export/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `super_prompt_${Date.now()}.zip`,
          files: [
            { name: "prompt.md", content: text },
            { name: "metadata.json", content: JSON.stringify({ exported_at: new Date().toISOString(), persona: selectedPersona, model: selectedModelId }, null, 2) }
          ]
        })
      });
      if (!res.ok) throw new Error("ZIP export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `super_prompt_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to download ZIP archive: " + String(err));
    } finally {
      setExportingId(null);
    }
  };

  const handleCopyCurl = async (text: string, msgId: string) => {
    try {
      setExportingId(msgId);
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBase}/api/export/curl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text.slice(0, 300),
          model: selectedModelId,
          persona: selectedPersona,
          api_url: `${apiBase}/api/prompt/stream`
        })
      });
      const data = await res.json();
      if (data.curl_command) {
        await navigator.clipboard.writeText(data.curl_command);
        setCopiedMessageId(`curl-${msgId}`);
        setTimeout(() => setCopiedMessageId(null), 2000);
      }
    } catch (err) {
      alert("Failed to generate cURL command: " + String(err));
    } finally {
      setExportingId(null);
    }
  };

  const handleCopyMarkdown = async (text: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(`md-${msgId}`);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      alert("Failed to copy Markdown");
    }
  };

  useEffect(() => {
    const supported = typeof window !== "undefined" && Boolean((window as unknown as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ?? (window as unknown as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition);
    // defer setState slightly to avoid a synchronous setState-in-effect lint error
    const id = window.setTimeout(() => setSpeechSupported(supported), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ai/models`, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          autoOption?: { label?: string; discountText?: string };
          selectedModelId?: string;
          models?: BackendModel[];
        };

        if (!isMounted) {
          return;
        }

        if (Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
        }

        if (data.autoOption?.discountText) {
          setDiscountText(data.autoOption.discountText);
        }

        if (typeof data.selectedModelId === "string" && data.selectedModelId.length > 0) {
          setSelectedModelId(data.selectedModelId);
        }
      } catch {
        // Keep fallback models silently.
      }
    };

    void loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // scroll to bottom whenever messages change
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } catch {}
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const onNewChat = () => {
      // clear composer and messages to start a fresh chat
      setInput("");
      setMessages([]);
      setIsAttachmentMenuOpen(false);
      setIsModelMenuOpen(false);
      setIsListening(false);
      recognitionRef.current?.stop();
    };

    window.addEventListener("my-prompt:new-chat", onNewChat as EventListener);
    const onLoadChat = (e: Event) => {
      try {
        // @ts-ignore
        const d = (e as CustomEvent).detail || {};
        const messagesPayload = d.messages;
        if (Array.isArray(messagesPayload) && messagesPayload.length > 0) {
          const mapped = messagesPayload.map((m: any, idx: number) => {
            const role = (m.role || "assistant").toLowerCase();
            const idPrefix = role === "user" ? "m-user" : "m-assistant";
            const ts = m.ts ? new Date(m.ts).getTime() : Date.now() + idx;
            return { id: `${idPrefix}-${Date.now()}-${idx}`, text: m.content || "", ts };
          });
          setMessages(mapped);
        } else {
          const prompt = d.prompt || "";
          const response = d.response || "";
          const userId = `m-user-${Date.now()}`;
          const assistantId = `m-assistant-${Date.now()+1}`;
          setMessages([{ id: userId, text: prompt, ts: Date.now() - 1000 }, { id: assistantId, text: response, ts: Date.now() }]);
        }
        setInput("");
        setIsAttachmentMenuOpen(false);
      } catch {
        // ignore
      }
    };
    window.addEventListener("my-prompt:load-chat", onLoadChat as EventListener);
    return () => {
      window.removeEventListener("my-prompt:new-chat", onNewChat as EventListener);
      window.removeEventListener("my-prompt:load-chat", onLoadChat as EventListener);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  // handleLogout is intentionally omitted when not used to avoid unused var linting

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) {
      return;
    }
    // append user message to local UI conversation
    if (trimmed) {
      const isNewThread = messages.length === 0;
      const userId = `m-user-${Date.now()}`;
      const assistantId = `m-assistant-${Date.now()}`;
      
      setMessages((cur) => [
        ...cur,
        { id: userId, text: trimmed, ts: Date.now() },
        { id: assistantId, text: "...", ts: Date.now() }
      ]);
      setInput("");
      
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
        const requestUserId = user?.id ? String(user.id).trim() : undefined;
        
        // Attempt SSE real-time streaming endpoint
        const response = await fetch(`${apiBase}/api/prompt/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            model: selectedModelId,
            persona: selectedPersona,
            attachments: attachments.map(a => ({ name: a.name, content: a.content || null, mime: a.mime || null, is_drive: a.isDrive || false })),
            user_id: requestUserId
          }),
        });

        if (!response.ok || !response.body) {
          // Fallback to legacy chat endpoint if stream not available
          const res = await fetch(`${apiBase}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: trimmed, model: selectedModelId, persona: selectedPersona, attachments: attachments.map(a => ({ name: a.name, content: a.content || null, mime: a.mime || null, is_drive: a.isDrive || false })), new_chat: isNewThread, user_id: requestUserId }),
          });
          const data = await res.json();
          const replyText = data && (data.reply || data.error) ? (data.reply || data.error) : "[No reply]";
          setMessages((cur) => cur.map(m => m.id === assistantId ? { ...m, text: replyText } : m));
          return;
        }

        // Consume Server-Sent Events stream with typewriter rendering
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedText = "";
        let buffer = "";

        // Reset target assistant message placeholder
        setMessages((cur) => cur.map(m => m.id === assistantId ? { ...m, text: "" } : m));

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("data: ")) {
              const dataStr = trimmedLine.slice(6).trim();
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.content) {
                  accumulatedText += parsed.content;
                  const currentText = accumulatedText;
                  setMessages((cur) => cur.map(m => m.id === assistantId ? { ...m, text: currentText } : m));
                  setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
                }
                if (parsed.telemetry) {
                  const telemetryData = parsed.telemetry as TelemetryData;
                  setMessages((cur) => cur.map(m => m.id === assistantId ? { ...m, telemetry: telemetryData } : m));
                }
              } catch {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        // Dispatch chat saved event once stream completes
        try {
          const savedMessages = [
            { role: "user", content: trimmed, ts: null },
            { role: "assistant", content: accumulatedText || "...", ts: null },
          ];
          if (typeof window !== "undefined" && user?.email) {
            const recentKey = `my-prompt-recent-chats:${user.email}`;
            const raw = localStorage.getItem(recentKey);
            const current = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(current) ? current : [];
            const next = [
              {
                id: Date.now(),
                prompt: trimmed,
                response: accumulatedText,
                messages: savedMessages,
                created_at: new Date().toISOString(),
              },
              ...list.filter((item) => item.prompt !== trimmed || item.response !== accumulatedText),
            ].slice(0, 8);
            localStorage.setItem(recentKey, JSON.stringify(next));
          }
          window.dispatchEvent(
            new CustomEvent("my-prompt:chat-saved", {
              detail: {
                prompt: trimmed,
                response: accumulatedText,
                messages: savedMessages,
                created_at: new Date().toISOString(),
              },
            }),
          );

          if (accumulatedText && accumulatedText.trim()) {
            void saveUniversalProject({
              title: trimmed.slice(0, 50) || "Workspace Super Prompt",
              prompt_type: "workspace_chat",
              persona: selectedPersona as any,
              target_model: selectedModelId,
              framework: "CO-STAR",
              raw_input: trimmed,
              generated_super_prompt: accumulatedText,
              metadata_json: { source: "workspace_chat" },
            });
          }
        } catch {}
      } catch (err) {
        setMessages((cur) => cur.map(m => m.id === assistantId ? { ...m, text: "[AI error: " + String(err) + "]" } : m));
      }
    }
  };

  const handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceInput = () => {
    if (!speechSupported) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const RecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new RecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = navigator.language || "en-US";

      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult?.[0]?.transcript?.trim() ?? "";
        if (!transcript) {
          return;
        }
        setInput((current) => (current.trim() ? `${current.trim()} ${transcript}` : transcript));
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    recognitionRef.current.start();
    setIsListening(true);
  };

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    }
    if (sizeInBytes < 1024 * 1024) {
      return `${Math.round(sizeInBytes / 1024)} KB`;
    }
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? "");
        const att: ComposerAttachment = {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          sizeLabel: formatFileSize(file.size),
          content,
          mime: file.type || null,
          isDrive: false,
        };
        setAttachments((current) => [...current, att].slice(0, 8));
      };

      // Read images as data URL, others as text
      if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    event.currentTarget.value = "";
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOverComposer(false);

    const fileList = event.dataTransfer.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    const mappedFiles = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      sizeLabel: formatFileSize(file.size),
    }));

    setAttachments((current) => [...current, ...mappedFiles].slice(0, 8));
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  };

  const openUploadPicker = () => {
    fileInputRef.current?.click();
  };

  const openPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  const openCodePicker = () => {
    codeInputRef.current?.click();
  };

  const openDriveModal = () => {
    setIsDriveModalOpen(true);
  };

  const handleAddDriveUrl = (url: string) => {
    if (!url || url.trim().length === 0) return;
    let name = url.split("/").filter(Boolean).slice(-1)[0] || url;
    if (name.length > 60) name = name.slice(0, 57) + "...";
    const newAtt: ComposerAttachment = { id: `drive-${Date.now()}`, name, sizeLabel: "drive-link", content: url, mime: "text/url", isDrive: true };
    setAttachments((cur) => [...cur, newAtt].slice(0, 8));
    setIsDriveModalOpen(false);
  };

  const clearComposer = () => {
    setInput("");
    setAttachments([]);
    setIsAttachmentMenuOpen(false);
    setIsListening(false);
    recognitionRef.current?.stop();
  };

  const applyAttachmentPreset = (preset: "drive" | "photos" | "code") => {
    if (preset === "drive") {
      setInput((current) => (current.trim() ? `${current.trim()}\n\nUse files from Google Drive for this task.` : "Use files from Google Drive for this task."));
    }
    if (preset === "photos") {
      setInput((current) => (current.trim() ? `${current.trim()}\n\nAnalyze attached photos and extract key insights.` : "Analyze attached photos and extract key insights."));
    }
    if (preset === "code") {
      setInput((current) =>
        current.trim()
          ? `${current.trim()}\n\nReview this code and suggest improvements for performance, readability, and bugs.`
          : "Review this code and suggest improvements for performance, readability, and bugs.",
      );
    }
    setIsAttachmentMenuOpen(false);
  };

  const formatMultiplier = (multiplier: number) => {
    return Number.isInteger(multiplier) ? `${multiplier}x` : `${multiplier.toFixed(2)}x`;
  };

  const selectedModelName =
    selectedModelId === "auto" ? "Auto" : models.find((model) => model.id === selectedModelId)?.name ?? "Model A";
  const canSend = input.trim().length > 0 || attachments.length > 0;
  const starterSuggestions = [
    "Build auth flow",
    "Fix TS error",
    "Optimize React",
    "Create API",
  ];

  const renderMessageContent = (text: string, id: string) => {
    // Handle fenced code blocks first
    if (text.includes("```")) {
      const parts = text.split(/```/);
      return parts.map((part, idx) => {
        if (idx % 2 === 0) {
          return (
            <div key={`${id}-txt-${idx}`} className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {part}
            </div>
          );
        }

        const firstLineEnd = part.indexOf("\n");
        const lang = firstLineEnd !== -1 ? part.slice(0, firstLineEnd).trim() : "code";
        const codeContent = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1) : part;

        return (
          <div key={`${id}-code-${idx}`} className="my-3 overflow-hidden rounded-xl border border-slate-800/90 bg-[#0B0F17] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-3.5 py-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="flex space-x-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </span>
                <span className="font-mono text-[11px] uppercase font-bold text-indigo-300 ml-1">
                  {lang || "CODE"}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codeContent.trim());
                  setCopiedMessageId(`code-${id}-${idx}`);
                  setTimeout(() => setCopiedMessageId(null), 2000);
                }}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition text-[11px] font-mono border border-slate-700/60"
              >
                <Copy size={11} />
                <span>{copiedMessageId === `code-${id}-${idx}` ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-indigo-100 overflow-x-auto leading-relaxed selection:bg-indigo-500/30">
              {codeContent}
            </pre>
          </div>
        );
      });
    }

    // Basic markdown-like parsing for headings, lists, bold, and horizontal rules
    const lines = text.split(/\n/);
    const nodes: any[] = [];
    let inList = false;
    lines.forEach((rawLine, idx) => {
      const line = rawLine.trimRight();
      if (line === "---" || line === "***") {
        if (inList) {
          nodes.push(<ul key={`ul-end-${idx}`} />); /* placeholder to close list */
          inList = false;
        }
        nodes.push(<hr key={`hr-${idx}`} className="my-4 border-[var(--app-border)]" />);
        return;
      }

      // Heading
      if (line.startsWith("### ")) {
        if (inList) { inList = false; }
        nodes.push(
          <h3 key={`h3-${idx}`} className="text-lg font-semibold mb-2">
            {line.slice(4)}
          </h3>,
        );
        return;
      }
      if (line.startsWith("## ")) {
        if (inList) { inList = false; }
        nodes.push(
          <h2 key={`h2-${idx}`} className="text-xl font-semibold mb-2">
            {line.slice(3)}
          </h2>,
        );
        return;
      }
      if (line.startsWith("# ")) {
        if (inList) { inList = false; }
        nodes.push(
          <h1 key={`h1-${idx}`} className="text-2xl font-semibold mb-2">
            {line.slice(2)}
          </h1>,
        );
        return;
      }

      // List item
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, (_m, p1) => p1);
        if (!inList) {
          inList = true;
          nodes.push(
            <ul key={`ul-start-${idx}`} className="mt-2 mb-2 list-disc pl-5 text-sm">
              <li key={`li-${idx}`}>{content}</li>
            </ul>,
          );
        } else {
          // append to last list (handle single child or array safely)
          const last = nodes.pop();
          const existingChildren = last && last.props && last.props.children ? React.Children.toArray(last.props.children) : [];
          existingChildren.push(<li key={`li-${idx}`}>{content}</li>);
          nodes.push(
            <ul key={`ul-${idx}`} className={last && last.props ? last.props.className : "mt-2 mb-2 list-disc pl-5 text-sm"}>
              {existingChildren}
            </ul>,
          );
        }
        return;
      }

      // Paragraph / inline formatting
      if (inList) { inList = false; }
      // Support images: ![alt](url)
      const inline = line
        .replace(/\*\*(.*?)\*\*/g, (_m, p1) => `__BOLD_START__${p1}__BOLD_END__`)
        .replace(/\*(.*?)\*/g, (_m, p1) => `__ITALIC_START__${p1}__ITALIC_END__`)
        .replace(/!\[(.*?)\]\((.*?)\)/g, (_m, p1, p2) => `__IMG_START__${p1}::${p2}__IMG_END__`)
        .replace(/\[(.*?)\]\((.*?)\)/g, (_m, p1, p2) => `__LINK_START__${p1}::${p2}__LINK_END__`);

      // convert placeholders back to elements
      const parts: any[] = [];
      let cursor = 0;
      const pushText = (s: string) => { if (s) parts.push(s); };
      const regex = /__BOLD_START__|__ITALIC_START__|__LINK_START__|__IMG_START__/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(inline)) !== null) {
        const start = match.index;
        pushText(inline.slice(cursor, start));
        if (match[0] === "__BOLD_START__") {
          const end = inline.indexOf("__BOLD_END__", regex.lastIndex);
          const content = inline.slice(regex.lastIndex, end);
          parts.push(<strong key={`b-${idx}-${start}`}>{content}</strong>);
          regex.lastIndex = end + "__BOLD_END__".length;
          cursor = regex.lastIndex;
        } else if (match[0] === "__ITALIC_START__") {
          const end = inline.indexOf("__ITALIC_END__", regex.lastIndex);
          const content = inline.slice(regex.lastIndex, end);
          parts.push(<em key={`i-${idx}-${start}`}>{content}</em>);
          regex.lastIndex = end + "__ITALIC_END__".length;
          cursor = regex.lastIndex;
        } else if (match[0] === "__LINK_START__") {
          const end = inline.indexOf("__LINK_END__", regex.lastIndex);
          const inner = inline.slice(regex.lastIndex, end);
          const [label, url] = inner.split("::");
          parts.push(
            <a key={`a-${idx}-${start}`} href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {label}
            </a>,
          );
          regex.lastIndex = end + "__LINK_END__".length;
          cursor = regex.lastIndex;
        } else if (match[0] === "__IMG_START__") {
          const end = inline.indexOf("__IMG_END__", regex.lastIndex);
          const inner = inline.slice(regex.lastIndex, end);
          const [alt, url] = inner.split("::");
          // render image with sensible max width
          parts.push(
            <img key={`img-${idx}-${start}`} src={url} alt={alt || "image"} className="mt-2 max-w-full rounded-md border border-[var(--app-border)]" />,
          );
          regex.lastIndex = end + "__IMG_END__".length;
          cursor = regex.lastIndex;
        }
      }
      pushText(inline.slice(cursor));

      nodes.push(
        <p key={`p-${idx}`} className="text-sm leading-relaxed">
          {parts.map((p, i) => (typeof p === "string" ? <span key={`t-${idx}-${i}`}>{p}</span> : p))}
        </p>,
      );
    });

    return <div className="prose max-w-none">{nodes}</div>;
  };

  return (
    <section className={publicMode ? "relative w-full h-screen min-h-screen flex items-stretch justify-center p-0 bg-[#0a0a0c]" : "relative mt-2 flex min-h-[calc(100vh-7rem)] w-full max-w-full overflow-x-hidden items-center justify-center px-2 sm:px-4 bg-[#0a0a0c]"}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_60%)]" />

      <div className={publicMode ? "relative w-full max-w-full h-full" : "relative w-full max-w-5xl min-w-0 min-h-[calc(100vh-8rem)] flex flex-col"}>
        {!publicMode && (
          <div className="sticky top-2 z-40 mb-4 flex w-full max-w-full items-center justify-between gap-2 overflow-x-auto no-scrollbar rounded-2xl border border-white/[0.08] bg-[#111116]/80 px-3 sm:px-4 py-2.5 backdrop-blur-xl shadow-lg">
            <div className="relative flex items-center gap-3">
              {/* Model Dropdown */}
              <button
                onClick={() => setIsModelMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#16161e] px-3.5 py-1.5 text-xs font-semibold text-white shadow-inner transition hover:border-indigo-500/40 hover:bg-[#1a1a24]"
              >
                <Sparkles size={14} className="text-indigo-400" />
                {selectedModelName}
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Persona Selector Pills */}
              <div className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#16161e] p-1 text-xs font-medium">
                {(["Architect", "Researcher", "Marketer"] as PersonaType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPersona(p)}
                    className={`rounded-lg px-2.5 py-1 transition-all ${
                      selectedPersona === p
                        ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold shadow-md shadow-indigo-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {p === "Architect" ? "🏛️ Architect" : p === "Researcher" ? "🔬 Researcher" : "🎯 Marketer"}
                  </button>
                ))}
              </div>

              {isModelMenuOpen ? (
                <div className="absolute left-0 top-12 z-50 w-[340px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#111116] p-1.5 shadow-2xl backdrop-blur-2xl">
                  <button
                    onClick={() => { setSelectedModelId("auto"); setIsModelMenuOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                      selectedModelId === "auto" ? "bg-indigo-600/20 text-indigo-300 font-semibold" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {selectedModelId === "auto" ? <Check size={14} className="text-indigo-400" /> : null}
                      Auto (Smart Routing)
                    </span>
                    <span className="text-[10px] text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded-md">{discountText}</span>
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => { setSelectedModelId(model.id); setIsModelMenuOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                          selectedModelId === model.id
                            ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                            : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <span>{model.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{formatMultiplier(model.multiplier)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-1 border-t border-white/[0.06] pt-1">
                    <Link
                      href="/settings"
                      className="block rounded-xl px-3 py-1.5 text-center text-xs font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white transition"
                    >
                      Manage API Keys & Models...
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5">
              <div className="hidden lg:inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#16161e] p-1 text-xs font-medium">
                <button
                  onClick={() => setActiveTab("workspace")}
                  className={`rounded-lg px-2.5 py-1 transition flex items-center gap-1.5 ${
                    activeTab === "workspace"
                      ? "bg-indigo-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles size={13} /> Workspace
                </button>
                <button
                  onClick={() => setActiveTab("arena")}
                  className={`rounded-lg px-2.5 py-1 transition flex items-center gap-1.5 ${
                    activeTab === "arena"
                      ? "bg-indigo-600 text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Swords size={13} /> Prompt Arena
                </button>
                <button
                  onClick={() => setIsVersionHistoryOpen(true)}
                  className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-white transition flex items-center gap-1.5"
                >
                  <History size={13} /> Versions
                </button>
                <Link
                  href="/marketplace"
                  className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-white transition flex items-center gap-1.5"
                >
                  <Store size={13} /> Marketplace
                </Link>
                <button
                  onClick={() => setIsVaultOpen(true)}
                  className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-white transition flex items-center gap-1.5"
                >
                  <Lock size={13} /> Vault
                </button>
                <button
                  onClick={() => setIsWorkflowOpen(true)}
                  className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-white transition flex items-center gap-1.5"
                >
                  <GitBranch size={13} /> Workflows
                </button>
                <button
                  onClick={() => setIsReferralOpen(true)}
                  className="rounded-lg px-2.5 py-1 text-amber-400 hover:text-amber-300 transition flex items-center gap-1.5 font-medium"
                >
                  <Gift size={13} /> Refer & Earn
                </button>
              </div>

              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                title="Open Command Palette (⌘ K)"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#16161e] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-indigo-500/40 transition font-mono shadow-sm"
              >
                <Command size={13} className="text-indigo-400" />
                <span>⌘ K</span>
              </button>

              <Link
                href="/login"
                aria-label="Open login"
                title="Login"
                className="rounded-xl border border-white/[0.08] bg-[#16161e] p-2 text-slate-400 shadow-sm transition hover:border-indigo-500/40 hover:text-white"
              >
                <UserPlus size={15} />
              </Link>
            </div>
          </div>
        )}

        {activeTab === "arena" ? (
          <div className="pt-4 w-full">
            <PromptArena />
          </div>
        ) : (
          <div className={publicMode ? "mx-auto w-full flex flex-col items-center justify-center py-0" : "mx-auto flex flex-1 flex-col items-center justify-between w-full pb-6 text-center"}>
            {!publicMode && messages.length === 0 ? (
              <div className="my-auto space-y-4 max-w-2xl py-12">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
                  <Sparkles size={13} className="text-cyan-400" /> Super Prompt SaaS v2.0
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  What will you build today?
                </h1>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Architect production-grade prompts, stream LLM generations in real-time, benchmark models in parallel, and export clean workflows.
                </p>

                {/* Starter Suggestions Grid */}
                <div className="pt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 max-w-xl mx-auto">
                  {starterSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput((current) => (current.trim() ? `${current.trim()} ${suggestion}` : suggestion))}
                      className="rounded-xl border border-white/[0.08] bg-[#16161e]/80 p-3 text-xs font-medium text-slate-300 transition hover:border-indigo-500/40 hover:bg-[#1f1f2b] hover:text-white text-left shadow-sm"
                    >
                      <span className="block font-semibold text-white mb-0.5">{suggestion}</span>
                      <span className="block text-[10px] text-slate-500">Quick template prompt</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Conversation Log Container */}
            <div
              onDrop={handleFileDrop}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => setIsDragOverComposer(true)}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsDragOverComposer(false);
                }
              }}
              className={`w-full flex-1 flex flex-col justify-between rounded-3xl border bg-[#111116]/90 p-4 shadow-2xl backdrop-blur-xl transition-all ${
                isDragOverComposer ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-white/[0.08]"
              }`}
            >
              {/* Header Status Row */}
              <div className="mb-3 flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono">SSE Stream Engine Active</span>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={clearComposer} aria-label="Clear composer" title="Clear chat & composer" className="rounded-lg border border-white/[0.08] bg-[#16161e] px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white transition">
                    Clear
                  </button>

                  <div className="hidden sm:block">
                    <ThemeToggle />
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#16161e] px-2.5 py-1 text-xs">
                    <span
                      className={`font-semibold ${
                        plan === "paid" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {plan === "paid" ? "Paid Pro Plan" : "Free Plan"}
                    </span>
                  </div>

                  <button
                    onClick={handleVoiceInput}
                    disabled={!speechSupported}
                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                    title={speechSupported ? (isListening ? "Listening..." : "Start voice input") : "Voice input not supported"}
                    className={`rounded-xl border border-white/[0.08] p-1.5 shadow-sm transition ${
                      isListening ? "bg-red-500 text-white animate-pulse" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    } ${!speechSupported ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <Mic size={18} />
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                aria-label="Attach files"
                title="Attach files"
                className="hidden"
                onChange={handleFileSelection}
              />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                aria-label="Attach photos"
                title="Attach photos"
                className="hidden"
                onChange={handleFileSelection}
              />
              <input
                ref={codeInputRef}
                type="file"
                accept=".txt,.js,.ts,.py,.java,.cpp,.c,.json,.md"
                multiple
                aria-label="Import code files"
                title="Import code files"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  const first = files[0];
                  const reader = new FileReader();
                  reader.onload = () => {
                    const text = String(reader.result ?? "");
                    setInput((cur) => (cur.trim() ? `${cur.trim()}\n\n${text}` : text));
                    const newAtt: ComposerAttachment = { id: `${first.name}-${first.lastModified}-${Math.random().toString(36).slice(2,8)}`, name: first.name, sizeLabel: formatFileSize(first.size), content: text, mime: first.type || null };
                    setAttachments((cur) => [...cur, newAtt].slice(0,8));
                  };
                  reader.readAsText(first);
                  e.currentTarget.value = "";
                }}
              />

              {/* Messages Output Scroll View */}
              {messages.length > 0 ? (
                <div className="mb-4 flex-1 overflow-y-auto space-y-4 p-2 pr-3 max-h-[58vh]">
                  {messages.map((m) => {
                    const isUser = m.id.startsWith("m-user");
                    if (isUser) {
                      return (
                        <div key={m.id} className="flex justify-end items-start space-x-3">
                          <div className="max-w-[75%] rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 px-4.5 py-3 text-white shadow-xl shadow-indigo-600/15 border border-white/10">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{m.text}</div>
                            <div className="mt-1 text-[10px] text-white/70 text-right font-mono">{new Date(m.ts).toLocaleTimeString()}</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/20 shrink-0">
                            {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className="flex justify-start items-start space-x-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0 mt-1">
                          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
                            <Sparkles size={16} className="text-cyan-400 animate-pulse" />
                          </div>
                        </div>
                        <div className="max-w-[95%] sm:max-w-[90%] w-full rounded-2xl border border-slate-800/90 bg-slate-900/95 p-5 text-slate-100 shadow-2xl backdrop-blur-xl space-y-4">
                          {/* Assistant Header Card */}
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-xs font-bold text-slate-100 tracking-wide flex items-center space-x-1.5">
                                <span>Super Prompt AI</span>
                                <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">v2.0</span>
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                {selectedPersona}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/60">
                              {new Date(m.ts).toLocaleTimeString()}
                            </div>
                          </div>

                          {/* Reasoning Trace Accordion (ChatGPT / Claude / DeepSeek Style) */}
                          <details className="group rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
                            <summary className="flex cursor-pointer items-center justify-between px-3.5 py-2 font-medium text-slate-400 hover:text-slate-200 transition">
                              <span className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                <span className="font-mono text-indigo-300 font-semibold">Thought Process & Metaprompt Reasoning Trace</span>
                              </span>
                              <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="border-t border-slate-800/80 p-3.5 space-y-2 font-mono text-[11px] text-slate-400 leading-relaxed bg-slate-950/90">
                              <p>1. Analyzing user input intent & key domain entities...</p>
                              <p>2. Applying {selectedPersona} persona guidelines & CO-STAR structural framework...</p>
                              <p>3. Enforcing negative constraints, edge-case coverage, and output format specs...</p>
                              <p className="text-emerald-400">✓ Metaprompt optimization complete. Output synthesized.</p>
                            </div>
                          </details>

                          {/* Message Content Body */}
                          <div className="prose max-w-none text-slate-200 text-sm leading-relaxed">
                            <MarkdownRenderer content={m.text} id={m.id} />
                          </div>

                          
                          {/* Real-time Telemetry Status Bar */}
                          {m.telemetry ? (
                            <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-800/80 pt-3 text-xs font-mono">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-semibold">
                                <Zap size={12} /> {m.telemetry.latency_ms} ms
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-semibold">
                                <Layers size={12} /> {m.telemetry.tokens_used} tokens
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-semibold">
                                <Coins size={12} /> ${m.telemetry.estimated_cost_usd.toFixed(5)}
                              </span>
                              <span className="ml-auto text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                Model: <code className="text-indigo-300 font-bold">{m.telemetry.provider || selectedModelId}</code>
                              </span>
                            </div>
                          ) : null}

                          {/* RLHF Feedback & Export Action Toolbar */}
                          <div className="border-t border-slate-800/80 pt-3 space-y-3">
                            <PromptFeedbackWidget
                              projectId="workspace-chat"
                              generatedPrompt={m.text}
                            />

                            <div className="flex items-center justify-end gap-2 text-xs pt-1">
                              <button
                                onClick={() => handleDownloadZip(m.text, m.id)}
                                disabled={exportingId === m.id}
                                title="Download prompt & metadata as ZIP archive"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white hover:border-slate-600 disabled:opacity-50 shadow-sm"
                              >
                                <Download size={13} /> ZIP
                              </button>
                              <button
                                onClick={() => handleCopyCurl(m.text, m.id)}
                                disabled={exportingId === m.id}
                                title="Copy formatted executable cURL command"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white hover:border-slate-600 disabled:opacity-50 shadow-sm"
                              >
                                <Terminal size={13} /> {copiedMessageId === `curl-${m.id}` ? "Copied!" : "cURL"}
                              </button>
                              {(m.text.toLowerCase().includes("<html") || m.text.toLowerCase().includes("<!doctype html") || m.text.includes("```html") || m.text.includes("```jsx") || m.text.includes("```tsx")) && (
                                <button
                                  onClick={() => setSandboxCode(m.text)}
                                  title="Preview in Live Code Sandbox"
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/30 shadow-sm"
                                >
                                  <Play size={13} className="fill-purple-300" /> Live Sandbox
                                </button>
                              )}
                              <button
                                onClick={() => handleCopyMarkdown(m.text, m.id)}
                                title="Copy prompt text as Markdown"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-600/30 shadow-sm"
                              >
                                <Copy size={13} /> {copiedMessageId === `md-${m.id}` ? "Copied!" : "Markdown"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : null}

              {/* Attachments Chips */}
              {attachments.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1a1a24] px-3 py-1 text-xs text-slate-200 shadow-sm"
                    >
                      <Paperclip size={13} className="text-indigo-400" />
                      <span className="max-w-[180px] truncate font-medium">{attachment.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{attachment.sizeLabel}</span>
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        aria-label={`Remove ${attachment.name}`}
                        title="Remove attachment"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-white transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Google Drive Modal */}
              {isDriveModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                  <div className="w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#111116] p-6 shadow-2xl">
                    <h3 className="mb-2 text-lg font-bold text-white">Add from Google Drive</h3>
                    <p className="mb-4 text-xs text-slate-400">Paste a shareable Google Drive link (or any external document URL) to include as context.</p>
                    <input id="drive-url-input" placeholder="https://drive.google.com/file/d/..." className="w-full rounded-xl border border-white/[0.1] bg-[#16161e] px-4 py-2.5 mb-4 outline-none text-xs text-white placeholder-slate-500 focus:border-indigo-500" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsDriveModalOpen(false)} className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-slate-400 hover:text-white">Cancel</button>
                      <button
                        onClick={() => {
                          const el = document.getElementById("drive-url-input") as HTMLInputElement | null;
                          handleAddDriveUrl(el?.value || "");
                        }}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                      >
                        Attach Link
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Floating Bottom Composer Dock */}
              <div className="mt-auto relative flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-[#16161e] p-2 shadow-2xl backdrop-blur-2xl">
                <div ref={attachmentMenuRef} className="relative">
                  <button
                    onClick={() => setIsAttachmentMenuOpen((open) => !open)}
                    aria-label="Add attachment"
                    title="Add attachment"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1f1f2b] text-slate-400 shadow-sm transition hover:border-indigo-500/40 hover:text-white"
                  >
                    <Plus size={18} />
                  </button>

                  {isAttachmentMenuOpen ? (
                    <div className="absolute bottom-12 left-0 z-50 w-52 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#111116] p-1.5 shadow-2xl backdrop-blur-2xl">
                      <button
                        onClick={openUploadPicker}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Paperclip size={15} className="text-indigo-400" />
                        Upload files
                      </button>
                      <button
                        onClick={openDriveModal}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <HardDrive size={15} className="text-emerald-400" />
                        Add from Drive
                      </button>
                      <button
                        onClick={openPhotoPicker}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Camera size={15} className="text-cyan-400" />
                        Photos / Scan ID
                      </button>
                      <button
                        onClick={openCodePicker}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Code2 size={15} className="text-purple-400" />
                        Import code
                      </button>
                    </div>
                  ) : null}
                </div>

                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleEnter}
                  placeholder="Ask Super Prompt anything... (⌘ Enter to send)"
                  className="h-10 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-500 font-sans"
                />

                {Boolean(input.match(/\{\{\s*([a-zA-Z0-9_]+)/)) && (
                  <button
                    onClick={() => {
                      setVariableModalTemplate(input);
                      setIsVariableModalOpen(true);
                    }}
                    title="Fill template variables"
                    className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs rounded-xl border border-cyan-500/40 transition flex items-center gap-1.5 shrink-0 animate-pulse"
                  >
                    <Sliders size={13} className="text-cyan-400" /> Fill Vars
                  </button>
                )}

                <button
                  onClick={() => setIsSuperPromptStudioOpen(true)}
                  title="Open Super Prompt Studio"
                  className="hidden sm:inline-flex px-2.5 py-1.5 bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 hover:from-indigo-600/30 hover:to-cyan-600/30 text-cyan-300 font-semibold text-xs rounded-xl border border-cyan-500/40 transition items-center gap-1.5 shrink-0"
                >
                  <Zap size={13} className="text-cyan-400 fill-current" /> Studio
                </button>

                <button
                  onClick={() => setIsDoctorOpen(true)}
                  title="Prompt Doctor (3 Q&A Diagnosis)"
                  className="hidden sm:inline-flex px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-medium text-xs rounded-xl border border-teal-500/30 transition items-center gap-1.5 shrink-0"
                >
                  <Stethoscope size={13} className="text-teal-400" /> Doctor
                </button>

                <button
                  onClick={() => setIsReverseOpen(true)}
                  title="Reverse Engineer Prompt from Output"
                  className="hidden sm:inline-flex px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-medium text-xs rounded-xl border border-purple-500/30 transition items-center gap-1.5 shrink-0"
                >
                  <RotateCcw size={13} className="text-purple-400" /> Reverse
                </button>

                <button
                  onClick={() => setIsRedTeamOpen(true)}
                  disabled={!input.trim()}
                  title="Red-Team Ambiguity Stress Test"
                  className="hidden sm:inline-flex px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 disabled:opacity-30 font-medium text-xs rounded-xl border border-rose-500/30 transition items-center gap-1.5 shrink-0"
                >
                  <ShieldAlert size={13} className="text-rose-400" /> Stress Test
                </button>

                <button
                  onClick={() => setIsLinterOpen(true)}
                  disabled={!input.trim()}
                  title="Lint / Score Prompt"
                  className="hidden sm:inline-flex px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 disabled:opacity-30 font-medium text-xs rounded-xl border border-indigo-500/30 transition items-center gap-1.5 shrink-0"
                >
                  <Sparkles size={13} className="text-indigo-400" /> Lint
                </button>

                <button
                  onClick={sendMessage}
                  aria-label="Send message"
                  title="Send message"
                  disabled={!canSend}
                  className={`h-9 px-4 rounded-xl flex items-center gap-1.5 text-xs font-bold transition shadow-md shrink-0 ${
                    canSend
                      ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-500/25"
                      : "bg-[#1f1f2b] text-slate-500 cursor-not-allowed border border-white/[0.06]"
                  }`}
                >
                  <span>Send</span>
                  <AudioLines size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Version Control Drawer */}
      <PromptVersionHistory
        projectId={1}
        currentPromptText={input}
        onRollbackSuccess={(restoredText) => setInput(restoredText)}
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
      />

      {/* BYOK Encrypted Key Vault */}
      <VaultSettings
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
      />

      {/* Automated Prompt Evaluator & Linter */}
      <PromptLinter
        currentPrompt={input}
        persona={selectedPersona}
        onApplyEnhancedPrompt={(enhancedText) => setInput(enhancedText)}
        isOpen={isLinterOpen}
        onClose={() => setIsLinterOpen(false)}
      />

      {/* In-Browser Live Sandbox Preview */}
      <LiveCodeSandbox
        code={sandboxCode || ""}
        isOpen={!!sandboxCode}
        onClose={() => setSandboxCode(null)}
      />

      {/* Multi-Step Prompt Chaining Workflows */}
      <PromptWorkflowRunner
        isOpen={isWorkflowOpen}
        onClose={() => setIsWorkflowOpen(false)}
        onInjectOutputToComposer={(out) => setInput(out)}
      />

      {/* Student Referral & Campus Ambassador System */}
      <ReferralDashboard
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
      />

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectModel={(mId) => setSelectedModelId(mId)}
        onTriggerAction={handlePaletteTriggerAction}
      />

      {/* Keyboard Shortcuts Cheat Sheet (?) */}
      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />

      {/* Dynamic Variable Prompt Form Modal */}
      <VariablePromptModal
        rawTemplate={variableModalTemplate}
        isOpen={isVariableModalOpen}
        onClose={() => setIsVariableModalOpen(false)}
        onInjectPrompt={(interpolatedText) => setInput(interpolatedText)}
      />

      {/* Super Prompt Metaprompt Studio */}
      <SuperPromptStudio
        isOpen={isSuperPromptStudioOpen}
        onClose={() => setIsSuperPromptStudioOpen(false)}
        initialPrompt={input}
        onApplyPrompt={(superPrompt) => setInput(superPrompt)}
      />

      {/* Prompt Doctor Diagnosis Modal */}
      <PromptDoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
        initialPrompt={input}
        onApplyMasterPrompt={(masterPrompt) => setInput(masterPrompt)}
      />

      {/* Reverse Prompt Engineering Modal */}
      <ReversePromptModal
        isOpen={isReverseOpen}
        onClose={() => setIsReverseOpen(false)}
        onApplyPromptPair={(sys, combined) => setInput(combined)}
      />

      {/* Red-Team Ambiguity Stress Test Modal */}
      <PromptRedTeamModal
        isOpen={isRedTeamOpen}
        onClose={() => setIsRedTeamOpen(false)}
        currentPrompt={input}
        onApplyPatchedPrompt={(patched) => setInput(patched)}
      />
    </section>

  );
}


