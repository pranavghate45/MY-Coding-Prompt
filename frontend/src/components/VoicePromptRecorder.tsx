"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Sparkles, AlertCircle, Volume2 } from "lucide-react";

interface VoicePromptRecorderProps {
  onPromptSynthesized?: (transcribedText: string, superPrompt: string) => void;
  persona?: string;
  framework?: string;
}

export function VoicePromptRecorder({
  onPromptSynthesized,
  persona = "Architect",
  framework = "CO-STAR",
}: VoicePromptRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleUploadAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      setErrorMessage("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleUploadAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "voice_thought_dump.webm");
      formData.append("persona", persona);
      formData.append("framework", framework);

      const res = await fetch("http://127.0.0.1:8000/api/prompt/from-audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Voice transcription failed.");
      }

      const data = await res.json();
      if (onPromptSynthesized) {
        onPromptSynthesized(data.transcribed_text, data.super_prompt);
      }
    } catch (err: any) {
      console.error("Audio processing failed", err);
      setErrorMessage(err.message || "Failed to process voice input.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="inline-flex items-center space-x-2 font-sans text-xs">
      {!isRecording && !isProcessing && (
        <button
          type="button"
          onClick={startRecording}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1.5 shadow-sm"
          title="Voice Thought-Dump: Click to record spoken ideas"
        >
          <Mic className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Voice Dump</span>
        </button>
      )}

      {isRecording && (
        <div className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <Volume2 className="w-4 h-4 text-rose-400 animate-bounce" />
          <span className="font-mono text-xs">{formatTimer(recordingTime)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="p-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition ml-1"
            title="Stop & Synthesize"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Transcribing & Synthesizing Super Prompt...</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center space-x-1 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
