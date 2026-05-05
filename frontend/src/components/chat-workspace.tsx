"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, Plus, UserPlus, ChevronDown, Check, Paperclip, HardDrive, Camera, Code2, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";

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
};

const fallbackModels: BackendModel[] = [
  { id: "gpt-4.1", name: "Model A", multiplier: 0 },
  { id: "gpt-4o", name: "Model B", multiplier: 0 },
  { id: "gemini-2.0-pro", name: "Model C", multiplier: 1 },
  { id: "sonar-pro", name: "Model D", multiplier: 1 },
  { id: "claude-3.7", name: "Model E", multiplier: 1 },
];

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
  const [discountText, setDiscountText] = useState("10% discount");
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [isDragOverComposer, setIsDragOverComposer] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      setMessages((cur) => [...cur, { id: userId, text: trimmed, ts: Date.now() }]);
      setInput("");
      // Call backend AI chat endpoint
      try {
        const requestUserId = user?.id ? String(user.id).trim() : undefined;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, model: selectedModelId, attachments: attachments.map(a => ({ name: a.name, content: a.content || null, mime: a.mime || null, is_drive: a.isDrive || false })), new_chat: isNewThread, user_id: requestUserId }),
        });
        const data = await res.json();
        const provider = (data && data.provider) || null;
        const replyText = data && (data.reply || data.error) ? (data.reply || data.error) : "[No reply]";
        const displayText = provider === "mock" ? `${replyText} (DEV-MOCK)` : replyText;
        const replyId = `m-assistant-${Date.now()}`;
        setMessages((cur) => {
          const next = [...cur, { id: replyId, text: displayText, ts: Date.now() }];
          // scroll after state update
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          return next;
        });
        try {
          const savedMessages = [
            { role: "user", content: trimmed, ts: null },
            { role: "assistant", content: displayText, ts: null },
          ];
          try {
            if (typeof window !== "undefined" && user?.email) {
              const recentKey = `my-prompt-recent-chats:${user.email}`;
              const raw = localStorage.getItem(recentKey);
              const current = raw ? JSON.parse(raw) : [];
              const list = Array.isArray(current) ? current : [];
              const next = [
                {
                  id: Date.now(),
                  prompt: trimmed,
                  response: displayText,
                  messages: savedMessages,
                  created_at: new Date().toISOString(),
                },
                ...list.filter((item) => item.prompt !== trimmed || item.response !== displayText),
              ].slice(0, 8);
              localStorage.setItem(recentKey, JSON.stringify(next));
            }
          } catch {}
          window.dispatchEvent(
            new CustomEvent("my-prompt:chat-saved", {
              detail: {
                prompt: trimmed,
                response: displayText,
                messages: savedMessages,
                created_at: new Date().toISOString(),
              },
            }),
          );
        } catch {}
      } catch (err) {
        const replyId = `m-assistant-${Date.now()}`;
        setMessages((cur) => {
          const next = [...cur, { id: replyId, text: "[AI error: " + String(err) + "]", ts: Date.now() }];
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          return next;
        });
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
      return parts.map((part, idx) =>
        idx % 2 === 0 ? (
          <div key={`${id}-txt-${idx}`} className="whitespace-pre-wrap text-sm leading-relaxed">
            {part}
          </div>
        ) : (
          <pre key={`${id}-code-${idx}`} className="mt-2 rounded-lg bg-[#0b1220] p-3 text-sm text-white font-mono overflow-x-auto">
            {part}
          </pre>
        ),
      );
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
    <section className={publicMode ? "relative w-full h-screen min-h-screen flex items-stretch justify-center p-0" : "relative mt-2 flex min-h-[calc(100vh-7rem)] items-center justify-center px-4"}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)]" />

      <div className={publicMode ? "relative w-full max-w-full h-full" : "relative w-full max-w-5xl min-h-[calc(100vh-8rem)]"}>
        {!publicMode && (
          <div className="absolute inset-x-0 top-1 flex items-center justify-between">
            <div className="relative">
              <button
                onClick={() => setIsModelMenuOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1.5 text-sm font-medium text-[var(--app-text)] shadow-sm"
              >
                {selectedModelName}
                <ChevronDown size={14} className="text-[var(--app-muted)]" />
              </button>

              {isModelMenuOpen ? (
                <div className="absolute left-0 top-11 z-30 w-[360px] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl">
                  <button
                    onClick={() => setSelectedModelId("auto")}
                    className={`flex w-full items-center justify-between border-b border-[var(--app-border)] px-3 py-2 text-left text-sm ${
                      selectedModelId === "auto" ? "bg-[var(--app-surface-2)] text-[var(--app-text)]" : "text-[var(--app-muted)]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {selectedModelId === "auto" ? <Check size={14} /> : null}
                      Auto
                    </span>
                    <span className="text-sm text-[var(--app-muted)]">{discountText}</span>
                  </button>

                  <div className="max-h-[420px] overflow-y-auto py-1">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-base transition ${
                          selectedModelId === model.id
                            ? "bg-[var(--app-surface-2)] text-[var(--app-text)]"
                            : "text-[var(--app-muted)] hover:bg-[var(--app-surface-2)]"
                        }`}
                      >
                        <span>{model.name}</span>
                        <span className="text-[var(--app-muted)]">{formatMultiplier(model.multiplier)}</span>
                      </button>
                    ))}
                  </div>

                  <Link
                    href="/settings"
                    className="block border-t border-[var(--app-border)] px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                  >
                    Manage Models...
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                aria-label="Open login"
                title="Login"
                className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] p-2 text-[var(--app-muted)] shadow-sm transition hover:text-[var(--app-text)]"
              >
                <UserPlus size={15} />
              </Link>
            </div>
          </div>
        )}

          <div className={publicMode ? "mx-auto w-full flex flex-col items-center justify-center py-0" : "mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col items-center justify-center pb-8 text-center"}>
            {!publicMode ? <p className="mb-8 text-5xl font-light tracking-[-0.035em] text-[var(--app-text)] sm:text-6xl">My Prompt</p> : null}
          <div
            onDrop={handleFileDrop}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => setIsDragOverComposer(true)}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsDragOverComposer(false);
              }
            }}
            className={`w-full h-full rounded-3xl border bg-[var(--app-surface)] p-3 shadow-sm backdrop-blur transition flex flex-col ${
              isDragOverComposer ? "border-[var(--app-text)]" : "border-[var(--app-border)]"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="relative">
                {/* Attachment button moved to bottom composer so it doesn't overlap assistant replies */}
              </div>

              <div className="relative flex items-center gap-3">
                <button onClick={clearComposer} aria-label="Clear composer" title="Clear composer" className="btn btn-secondary px-2 py-1 text-xs">
                  Clear
                </button>

                <div className="hidden sm:block">
                  <ThemeToggle />
                </div>

                <div className="inline-flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-bg)] p-1">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      plan === "free"
                        ? "bg-[var(--app-text)] text-[var(--app-bg)]"
                        : "text-[var(--app-muted)]"
                    }`}
                  >
                    Free
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      plan === "paid"
                        ? "bg-[var(--app-text)] text-[var(--app-bg)]"
                        : "text-[var(--app-muted)]"
                    }`}
                  >
                    Paid Pro
                  </span>
                </div>

                <button
                  onClick={handleVoiceInput}
                  disabled={!speechSupported}
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  title={speechSupported ? (isListening ? "Listening..." : "Start voice input") : "Voice input not supported"}
                  className={`rounded-full border border-[var(--app-border)] p-1.5 shadow-sm transition ${
                    isListening ? "bg-[var(--app-text)] text-[var(--app-bg)]" : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  } ${!speechSupported ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <Mic size={20} />
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

            {messages.length > 0 ? (
              <div className="mb-3 flex-1 overflow-y-auto space-y-3 p-2" style={{ maxHeight: '60vh' }}>
                {messages.map((m) => {
                  const isUser = m.id.startsWith("m-user");
                  if (isUser) {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[70%] rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white shadow">
                          <div className="whitespace-pre-wrap text-sm">{m.text}</div>
                          <div className="mt-1 text-xs opacity-80 text-right">{new Date(m.ts).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className="flex justify-start">
                      <div className="max-w-[70%] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3 text-[var(--app-text)] shadow-sm">
                        <div className="prose max-w-none">{renderMessageContent(m.text, m.id)}</div>
                        <div className="mt-2 text-xs opacity-80 text-left">{new Date(m.ts).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : null}

            {attachments.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1 text-xs text-[var(--app-text)]"
                  >
                    <Paperclip size={12} className="text-[var(--app-muted)]" />
                    <span className="max-w-[180px] truncate">{attachment.name}</span>
                    <span className="text-[var(--app-muted)]">{attachment.sizeLabel}</span>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                      title="Remove attachment"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {isDriveModalOpen ? (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
                <div className="w-full max-w-lg rounded-xl bg-[var(--app-surface)] p-5">
                  <h3 className="mb-3 text-lg font-semibold">Add from Drive</h3>
                  <p className="mb-3 text-sm text-[var(--app-muted)]">Paste a shareable Google Drive link (or any file URL) and press Add.</p>
                  <input id="drive-url-input" placeholder="https://drive.google.com/..." className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 mb-3 outline-none text-sm" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsDriveModalOpen(false)} className="btn btn-secondary">Cancel</button>
                    <button
                      onClick={() => {
                        const el = document.getElementById("drive-url-input") as HTMLInputElement | null;
                        handleAddDriveUrl(el?.value || "");
                      }}
                      className="btn btn-primary"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--app-muted)]">
              <span>{isDragOverComposer ? "Drop files to attach" : "Tip: Drag and drop files into this box"}</span>
              <span>{attachments.length}/8 attachments</span>
            </div>

            <div className="mt-auto sticky bottom-3 flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 shadow-lg">
              <div ref={attachmentMenuRef} className="relative">
                <button
                  onClick={() => setIsAttachmentMenuOpen((open) => !open)}
                  aria-label="Add attachment"
                  title="Add attachment"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)] shadow-sm transition hover:text-[var(--app-text)]"
                >
                  <Plus size={20} />
                </button>

                {isAttachmentMenuOpen ? (
                  <div className="absolute bottom-14 left-0 z-50 w-56 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-xl">
                    <button
                      onClick={openUploadPicker}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
                    >
                      <Paperclip size={18} className="text-[var(--app-muted)]" />
                      Upload files
                    </button>
                    <button
                      onClick={openDriveModal}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
                    >
                      <HardDrive size={18} className="text-[var(--app-muted)]" />
                      Add from Drive
                    </button>
                    <button
                      onClick={openPhotoPicker}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
                    >
                      <Camera size={18} className="text-[var(--app-muted)]" />
                      Photos
                    </button>
                    <button
                      onClick={openCodePicker}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
                    >
                      <Code2 size={18} className="text-[var(--app-muted)]" />
                      Import code
                    </button>
                  </div>
                ) : null}
              </div>

              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleEnter}
                placeholder="Ask anything"
                className="h-10 flex-1 bg-transparent text-base text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
              />
              <button onClick={sendMessage} aria-label="Send message" title="Send message" disabled={!canSend} className={`btn ${canSend ? "btn-primary" : "btn btn-secondary cursor-not-allowed opacity-60"} h-10 w-10 p-0 rounded-full`}>
                <AudioLines size={18} />
              </button>
            </div>

            <div className="mt-2 grid w-full grid-cols-2 gap-2 md:grid-cols-4">
              {starterSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput((current) => (current.trim() ? `${current.trim()} ${suggestion}` : suggestion))}
                  className="w-full rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--app-muted)] transition hover:-translate-y-px hover:text-[var(--app-text)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
