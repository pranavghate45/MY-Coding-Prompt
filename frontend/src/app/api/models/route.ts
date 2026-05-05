import { NextResponse } from "next/server";

type ModelItem = {
  id: string;
  name: string;
  multiplier: number;
};

const modelItems: ModelItem[] = [
  { id: "gpt-4.1", name: "GPT-4.1", multiplier: 0 },
  { id: "gpt-4o", name: "GPT-4o", multiplier: 0 },
  { id: "gpt-5-mini", name: "GPT-5 mini", multiplier: 0 },
  { id: "raptor-mini-preview", name: "Raptor mini (Preview)", multiplier: 0 },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", multiplier: 0.33 },
  { id: "claude-opus-4-5", name: "Claude Opus 4.5", multiplier: 3 },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", multiplier: 3 },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", multiplier: 1 },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", multiplier: 1 },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", multiplier: 1 },
  { id: "gemini-2-5-pro", name: "Gemini 2.5 Pro", multiplier: 1 },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)", multiplier: 0.33 },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)", multiplier: 1 },
  { id: "gemini-3-1-pro-preview", name: "Gemini 3.1 Pro (Preview)", multiplier: 1 },
  { id: "gpt-5.1", name: "GPT-5.1", multiplier: 1 },
  { id: "gpt-5.1-codex", name: "GPT-5.1-Codex", multiplier: 1 },
  { id: "gpt-5.1-codex-max", name: "GPT-5.1-Codex-Max", multiplier: 1 },
  { id: "gpt-5.1-codex-mini-preview", name: "GPT-5.1-Codex-Mini (Preview)", multiplier: 0.33 },
  { id: "gpt-5.2", name: "GPT-5.2", multiplier: 1 },
  { id: "gpt-5.2-codex", name: "GPT-5.2-Codex", multiplier: 1 },
  { id: "gpt-5.3-codex", name: "GPT-5.3-Codex", multiplier: 1 },
  { id: "grok-code-fast-1", name: "Grok Code Fast 1", multiplier: 0.25 },
];

export async function GET() {
  return NextResponse.json({
    autoOption: {
      label: "Auto",
      discountText: "10% discount",
    },
    selectedModelId: "claude-haiku-4-5",
    models: modelItems,
  });
}
