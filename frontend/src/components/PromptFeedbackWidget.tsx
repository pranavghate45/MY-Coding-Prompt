"use client";

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Check, Sparkles } from "lucide-react";

interface PromptFeedbackWidgetProps {
  projectId?: string;
  originalPrompt?: string;
  generatedPrompt?: string;
}

const FEEDBACK_CATEGORIES = [
  { id: "hallucination", label: "Hallucinated Info" },
  { id: "poor_structure", label: "Poor Structure" },
  { id: "slow", label: "Too Vague" },
  { id: "perfect", label: "Perfect Output" },
];

export function PromptFeedbackWidget({ projectId, originalPrompt, generatedPrompt }: PromptFeedbackWidgetProps) {
  const [rating, setRating] = useState<"+1" | "-1" | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("perfect");
  const [userEdit, setUserEdit] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRating = async (selectedRating: "+1" | "-1") => {
    setRating(selectedRating);
    if (selectedRating === "-1") {
      setShowDropdown(true);
    } else {
      await submitFeedback(selectedRating, "perfect", "");
    }
  };

  const submitFeedback = async (
    currentRating: "+1" | "-1",
    category: string,
    editedText: string
  ) => {
    setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/prompt/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId || "workspace-demo",
          rating: currentRating,
          feedback_category: category,
          user_edited_prompt: editedText.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error("Failed to submit prompt feedback", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDropdownSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating) {
      submitFeedback(rating, selectedCategory, userEdit);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium py-1">
        <Check className="w-4 h-4 text-emerald-400" />
        <span>Thank you for your feedback! (RLHF dataset updated)</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3 text-xs text-slate-400">
        <span className="font-medium text-slate-300">Rate Quality:</span>
        <button
          onClick={() => handleRating("+1")}
          disabled={submitting}
          className={`p-1.5 rounded-lg border transition flex items-center space-x-1 ${
            rating === "+1"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
          title="Good prompt generation"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>Accurate</span>
        </button>
        <button
          onClick={() => handleRating("-1")}
          disabled={submitting}
          className={`p-1.5 rounded-lg border transition flex items-center space-x-1 ${
            rating === "-1"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
          title="Needs improvement"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          <span>Needs Improvement</span>
        </button>
      </div>

      {showDropdown && (
        <form onSubmit={handleDropdownSubmit} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 max-w-md text-xs">
          <p className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Feedback Category (2-click RLHF)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-2 rounded-lg border text-left transition font-medium text-xs ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-[11px] text-slate-400 font-medium">Optional: Describe your correction / prompt edit</label>
            <textarea
              rows={2}
              placeholder="e.g. Add explicit negative constraints for security..."
              value={userEdit}
              onChange={(e) => setUserEdit(e.target.value)}
              className="w-full mt-1 p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowDropdown(false)}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              {submitting ? "Saving..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
