"use client";

import React, { useState } from "react";
import { GraduationCap, FileText, UploadCloud, CheckCircle2, Sparkles, ShieldCheck, Scan, AlertCircle, RefreshCw } from "lucide-react";

interface StudentVerificationEmailProps {
  user_id: string;
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
}

export function StudentVerificationEmail({ user_id, onSuccess, onError }: StudentVerificationEmailProps) {
  const [activeMode, setActiveMode] = useState<"email" | "id_card">("email");
  const [collegEmail, setCollegeEmail] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setIdFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (activeMode === "email") {
      if (!collegEmail.trim()) {
        setError("Please enter your college email address");
        return;
      }

      if (!collegEmail.includes("@")) {
        setError("Please enter a valid educational email");
        return;
      }

      setLoading(true);

      try {
        const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        const url = `${base}/api/student/request-verification`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: parseInt(user_id) || 1,
            college_email: collegEmail.trim().toLowerCase(),
          }),
        });

        const data = await res.json();

        if (res.ok) {
          const msgText = data.detail || data.message || "Verification OTP sent! Check your email inbox.";
          setMessage(msgText);
          setCollegeEmail("");
          if (onSuccess) onSuccess(collegEmail);
        } else {
          const errorMsg = data?.detail || data?.message || "Verification request failed";
          const errorText = typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg);
          setError(errorText);
          if (onError) onError(errorText);
        }
      } catch (err) {
        let errorMsg = "Failed to request verification. Check your network connection.";
        if (err instanceof Error) {
          errorMsg = err.message;
        }
        setError(errorMsg);
        if (onError) onError(errorMsg);
      } finally {
        setLoading(false);
      }
    } else {
      if (!idFile) {
        setError("Please select or drop a Student ID card image to upload");
        return;
      }

      setLoading(true);
      try {
        const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        const formData = new FormData();
        formData.append("user_id", user_id);
        formData.append("file", idFile);
        if (collegEmail.trim()) {
          formData.append("college_email", collegEmail.trim());
        }

        const res = await fetch(`${base}/api/student/upload-id`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (res.ok) {
          const msgText = data.message || "Student ID analyzed & verified via OCR!";
          setMessage(msgText);
          setIdFile(null);
          if (onSuccess) onSuccess(collegEmail || "ID Card Uploaded");
        } else {
          const errorMsg = data?.detail || data?.message || "ID Verification failed";
          const errorText = typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg);
          setError(errorText);
          if (onError) onError(errorText);
        }
      } catch (err) {
        let errorMsg = "Failed to upload ID card. Check your network connection.";
        if (err instanceof Error) {
          errorMsg = err.message;
        }
        setError(errorMsg);
        if (onError) onError(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Step Indicator Pills */}
      <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-xs font-medium">
        <div className="flex items-center gap-2 text-purple-400 font-semibold">
          <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] border border-purple-500/40">1</span>
          <span>College Auth</span>
        </div>
        <div className="w-8 h-px bg-slate-800" />
        <div className="flex items-center gap-2 text-slate-500">
          <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] border border-slate-800">2</span>
          <span>OTP Check</span>
        </div>
        <div className="w-8 h-px bg-slate-800" />
        <div className="flex items-center gap-2 text-slate-500">
          <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] border border-slate-800">3</span>
          <span>Pro Unlocked</span>
        </div>
      </div>

      {/* Perk Highlights Banner */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950 rounded-2xl border border-purple-500/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
              <span>Verified Student Pro Access</span>
              <span className="px-2 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 rounded font-semibold border border-emerald-500/30">100% Free</span>
            </h4>
            <p className="text-[11px] text-slate-400">Unlimited Groq/OpenAI tokens, Arena benchmarks & Prompt Chaining</p>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800/80">
        <button
          type="button"
          onClick={() => { setActiveMode("email"); setError(""); setMessage(""); }}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeMode === "email"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>College Email OTP</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveMode("id_card"); setError(""); setMessage(""); }}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeMode === "id_card"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>ID Card OCR Upload</span>
        </button>
      </div>

      {/* Email Verification Form */}
      {activeMode === "email" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">
              Institutional Email Address (.edu, .ac.in)
            </label>
            <p className="text-[11px] text-slate-400">
              Supported across 40+ verified educational domains (IITs, NITs, BITS, Ivy League, Global Universities).
            </p>
            <input
              type="email"
              placeholder="e.g. alex@iitbombay.ac.in"
              value={collegEmail}
              onChange={(e) => setCollegeEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !collegEmail.trim()}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{loading ? "Requesting OTP..." : "Send Verification OTP"}</span>
          </button>
        </form>
      ) : (
        /* ID Card OCR Upload Dropzone */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">
              Upload Student ID Card / Official Document
            </label>
            <p className="text-[11px] text-slate-400">
              Use OCR fallback if your institutional domain is missing. Upload a photo or PDF of your student ID.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-3 ${
              dragActive
                ? "border-purple-500 bg-purple-950/20"
                : idFile
                ? "border-emerald-500/50 bg-emerald-950/10"
                : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
            }`}
          >
            {loading && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 animate-scanline" />}

            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {idFile ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <UploadCloud className="w-6 h-6" />}
            </div>

            {idFile ? (
              <div className="space-y-1">
                <span className="font-bold text-xs text-emerald-300">{idFile.name}</span>
                <p className="text-[10px] text-slate-500">{(idFile.size / 1024).toFixed(1)} KB • Ready for OCR Scan</p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="font-semibold text-xs text-slate-300">Drag & drop your ID card here, or browse</span>
                <p className="text-[10px] text-slate-500">Supports PNG, JPG, WEBP, PDF (Max 10MB)</p>
              </div>
            )}

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setIdFile(e.target.files?.[0] || null)}
              disabled={loading}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !idFile}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
            <span>{loading ? "Analyzing ID Card with OCR..." : "Upload & Analyze ID Card"}</span>
          </button>
        </form>
      )}

      {/* Notifications */}
      {message && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default StudentVerificationEmail;
