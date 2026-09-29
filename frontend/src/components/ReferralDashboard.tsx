"use client";

import React, { useState, useEffect } from "react";
import { Gift, Copy, Check, Trophy, Users, Award, RefreshCw, X, Sparkles, Star } from "lucide-react";
import { ReferralStatsResponse, LeaderboardAmbassador } from "../types/api";

interface ReferralDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReferralDashboard({ isOpen, onClose }: ReferralDashboardProps) {
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardAmbassador[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Claim Code State
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      const [statsRes, lbRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/referral/stats?user_id=default_user"),
        fetch("http://127.0.0.1:8000/api/referral/leaderboard"),
      ]);

      if (statsRes.ok) {
        const statsData: ReferralStatsResponse = await statsRes.json();
        setStats(statsData);
      }
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to fetch referral data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReferralData();
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    if (stats?.referral_link) {
      navigator.clipboard.writeText(stats.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaimCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode.trim()) return;

    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/referral/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referee_id: "default_user",
          referral_code: claimCode.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setClaimMsg(data.message);
        setClaimCode("");
        await fetchReferralData();
      } else {
        const err = await res.json().catch(() => ({}));
        setClaimMsg(err.detail || "Failed to claim referral code");
      }
    } catch (err) {
      setClaimMsg("Error connecting to referral API");
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Refer & Earn - Campus Ambassador Program</h3>
              <p className="text-xs text-slate-400">Invite fellow students to earn +500 bonus AI credits per verified referral</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Referral Card Banner */}
          {stats && (
            <div className="bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-950 p-6 rounded-2xl border border-amber-500/30 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    Your Unique Ambassador Code
                  </span>
                  <div className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>{stats.referral_code}</span>
                    <span className="text-xs font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                      Rank #{stats.rank}
                    </span>
                  </div>
                </div>

                {/* Stats Counters */}
                <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                  <div>
                    <div className="text-slate-400 text-[10px]">Bonus Credits</div>
                    <div className="text-amber-400 font-bold text-sm">+{stats.bonus_credits}</div>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <div className="text-slate-400 text-[10px]">Verified Referrals</div>
                    <div className="text-purple-300 font-bold text-sm">{stats.successful_referrals_count}</div>
                  </div>
                </div>
              </div>

              {/* Shareable Link Bar */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Your Shareable Invite Link</label>
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={stats.referral_link}
                    className="flex-1 bg-transparent text-xs text-slate-200 font-mono outline-none px-2"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Claim Referral Code Input */}
          <form onSubmit={handleClaimCode} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Were you invited by a friend? Claim Code (+500 Credits)
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter invite code e.g. REF-A8B9C2"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                className="flex-1 bg-slate-900 text-xs text-slate-100 placeholder-slate-500 p-2.5 rounded-xl border border-slate-800 focus:outline-none uppercase font-mono"
              />
              <button
                type="submit"
                disabled={claiming || !claimCode.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition"
              >
                {claiming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Claim +500 Credits"}
              </button>
            </div>

            {claimMsg && (
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-300">
                {claimMsg}
              </div>
            )}
          </form>

          {/* Campus Ambassador Leaderboard */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Top 10 Campus Ambassador Leaderboard</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Updated Real-Time</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading ambassador rankings...</div>
            ) : leaderboard.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 p-4">
                No ambassadors on leaderboard yet. Share your link to claim rank #1!
              </div>
            ) : (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-800/80">
                  {leaderboard.map((amb) => (
                    <div key={amb.user_id} className="flex items-center justify-between p-3.5 text-xs hover:bg-slate-900/60 transition">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          amb.rank === 1
                            ? "bg-amber-400 text-slate-950"
                            : amb.rank === 2
                            ? "bg-slate-300 text-slate-950"
                            : amb.rank === 3
                            ? "bg-amber-700 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {amb.rank}
                        </span>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {amb.user_name}
                            {amb.rank <= 3 && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">{amb.referral_code}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-bold text-purple-300 font-mono">{amb.successful_referrals_count} Verified</div>
                          <div className="text-[10px] text-slate-500 font-mono">+{amb.bonus_credits} credits</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
