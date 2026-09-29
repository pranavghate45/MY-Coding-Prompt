"use client";

import React, { useState, useRef, useEffect } from "react";
import { KeyRound, ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface StudentOTPVerificationProps {
  user_id: string;
  collegeEmail: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onBack?: () => void;
}

export function StudentOTPVerification({ user_id, collegeEmail, onSuccess, onError, onBack }: StudentOTPVerificationProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);

    // Auto-submit if 6 digits entered
    if (value.length === 6) {
      handleVerifyOTP(value);
    }
  };

  const handleVerifyOTP = async (otpCode: string) => {
    setError("");
    setMessage("");

    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter a valid 6-digit OTP code");
      return;
    }

    setLoading(true);

    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const url = `${base}/api/student/verify-otp`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(user_id) || 1,
          otp_code: otpCode,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const msgText = data?.message || "Email verified! Student Pro Plan activated!";
        setMessage(msgText);
        setOtp("");
        setTimeout(() => {
          if (onSuccess) onSuccess(data);
        }, 1200);
      } else {
        const errorMsg = data?.detail || data?.message || "OTP verification failed";
        const errorText = typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg);
        setError(errorText);
        setOtp("");
        if (onError) onError(errorText);
      }
    } catch (err) {
      let errorMsg = "Failed to verify OTP. Check your network connection.";
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const url = `${base}/api/student/resend-otp`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(user_id) || 1,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("New 6-digit OTP sent! Check your email inbox.");
        setTimer(600);
        setCanResend(false);
        setOtp("");
      } else {
        const errorMsg = data?.detail || data?.message || "Failed to resend OTP";
        const errorText = typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg);
        setError(errorText);
      }
    } catch (err) {
      let errorMsg = "Failed to resend OTP. Check connection.";
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Step Indicator Pills */}
      <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-xs font-medium">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] border border-slate-800">1</span>
          <span>College Auth</span>
        </div>
        <div className="w-8 h-px bg-purple-500/40" />
        <div className="flex items-center gap-2 text-purple-400 font-semibold">
          <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] border border-purple-500/40">2</span>
          <span>OTP Check</span>
        </div>
        <div className="w-8 h-px bg-slate-800" />
        <div className="flex items-center gap-2 text-slate-500">
          <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] border border-slate-800">3</span>
          <span>Pro Unlocked</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="space-y-1 text-center sm:text-left">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-purple-400" />
          <span>Enter 6-Digit OTP Code</span>
        </h3>
        <p className="text-xs text-slate-400">
          We sent a verification code to <span className="font-semibold text-purple-300">{collegeEmail || "your college email"}</span>
        </p>
      </div>

      {/* 6-Digit Code Input Box */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-4">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={handleOTPChange}
          disabled={loading}
          placeholder="000000"
          className="w-full px-4 py-3.5 text-center text-3xl tracking-[0.3em] font-mono font-bold bg-slate-900 border-2 border-slate-800 text-purple-300 placeholder-slate-600 rounded-xl focus:outline-none focus:border-purple-500 shadow-inner"
        />

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Expires in:</span>
            <span className={timer < 60 ? "text-red-400 font-bold animate-pulse" : "text-slate-300 font-semibold"}>
              {formatTime(timer)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!canResend || loading}
            className="text-purple-400 hover:text-purple-300 font-semibold disabled:text-slate-600 disabled:cursor-not-allowed transition"
          >
            {canResend ? "Resend Code" : "Resend Code"}
          </button>
        </div>

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

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleVerifyOTP(otp)}
            disabled={loading || otp.length !== 6}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{loading ? "Verifying OTP..." : "Verify & Unlock Pro"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentOTPVerification;
