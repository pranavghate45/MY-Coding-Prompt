export type PromptType =
  | "workspace_chat"
  | "website_wizard"
  | "prompt_doctor"
  | "arena_battle"
  | "vision_ui"
  | "workflow_chain";

export type PersonaType = "Architect" | "Researcher" | "Marketer" | "Standard";

export interface TelemetryData {
  tokens_used: number;
  latency_ms: number;
  estimated_cost_usd: number;
  provider?: string;
}

export interface UniversalProject {
  id: string;
  user_id: string;
  title: string;
  prompt_type: PromptType;
  persona: PersonaType;
  target_model: string;
  framework: string;
  raw_input: string;
  generated_super_prompt: string;
  metadata_json: Record<string, any>;
  is_favorite: boolean;
  tokens_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectFilters {
  type?: PromptType | "all";
  persona?: PersonaType;
  search?: string;
  is_favorite?: boolean;
  sort_by?: "newest" | "tokens" | "alphabetical" | "oldest";
  page?: number;
  limit?: number;
}

export interface ProjectCreatePayload {
  id?: string;
  user_id?: string;
  title?: string;
  prompt_type?: PromptType;
  persona?: PersonaType;
  target_model?: string;
  framework?: string;
  raw_input?: string;
  generated_super_prompt: string;
  metadata_json?: Record<string, any>;
  is_favorite?: boolean;
}

export interface ProjectUpdatePayload {
  title?: string;
  prompt_type?: PromptType;
  persona?: PersonaType;
  target_model?: string;
  framework?: string;
  raw_input?: string;
  generated_super_prompt?: string;
  metadata_json?: Record<string, any>;
  is_favorite?: boolean;
}

export interface ProjectListResponse {
  status: string;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  projects: UniversalProject[];
}

export interface ProjectDetailResponse {
  status: string;
  project: UniversalProject;
}

// Prompt Doctor Types
export interface DoctorQuestion {
  id: string;
  question: string;
  options: string[];
  category?: string;
}

export interface DiagnosePromptResponse {
  status: string;
  questions: DoctorQuestion[];
}

export interface SynthesizePromptResponse {
  status: string;
  master_prompt: string;
}

// Prompt Arena Types
export interface ArenaModelResponse {
  model_name: string;
  model?: string;
  response: string;
  latency_ms: number;
  tokens_used: number;
  cost_usd: number;
  estimated_cost_usd: number;
  score?: number;
  evaluation_breakdown?: Record<string, any>;
}

export interface ArenaComparisonResponse {
  winner: string;
  model_a: ArenaModelResponse;
  model_b: ArenaModelResponse;
  prompt?: string;
  scoreboard: {
    faster_model?: string;
    fastest_model?: string;
    latency_delta_ms?: number;
    latency_difference_ms?: number;
    cheaper_model?: string;
    cheapest_model?: string;
    cost_difference_usd: number;
  };
}

// Prompt Evaluator & Linter Types
export interface PromptEvaluationResult {
  score: number;
  overall_score: number;
  summary: string;
  suggestions: string[];
  grammar_score?: number;
  clarity_score?: number;
  structure_score?: number;
  safety_score?: number;
  pillar_scores: {
    role_and_context: number;
    constraints_and_guardrails: number;
    output_structure: number;
  };
  enhanced_prompt: string;
}

// RedTeam Stress Test Types
export interface RedTeamPatch {
  vulnerability: string;
  patch: string;
  target_phrase?: string;
  replacement_text: string;
}

export interface RedTeamFlaggedTerm {
  word: string;
  reason: string;
  suggested_patch?: string;
}

export interface RedTeamResponse {
  status: string;
  risk_score: number;
  overall_score: number;
  ambiguity_level: number;
  hallucination_vulnerability: number;
  instruction_leakage_risk: number;
  edge_case_coverage: number;
  flagged_terms: any[];
  patches: RedTeamPatch[];
  jailbreak_detected?: boolean;
  prompt_injection_risk?: string;
}

// Version Control Types
export interface PromptVersionItem {
  id: number;
  version_number: number;
  prompt_text: string;
  change_summary: string;
  created_at: string;
  is_selected?: boolean;
  title?: string;
  author?: string;
}

export interface PromptVersionsResponse {
  status: string;
  versions: PromptVersionItem[];
}

export interface RollbackVersionResponse {
  status: string;
  active_version?: PromptVersionItem;
  restored_version?: PromptVersionItem;
}

// Multi-Step Workflow Types
export interface WorkflowStepTrace {
  step_number: number;
  name: string;
  model: string;
  persona: string;
  prompt_used: string;
  output: string;
  latency_ms: number;
  tokens_used: number;
  cost_usd: number;
}

export interface WorkflowExecutionResponse {
  status: string;
  workflow_name: string;
  total_steps: number;
  execution_trace: WorkflowStepTrace[];
  final_output: string;
  total_latency_ms?: number;
  total_tokens_used?: number;
  total_estimated_cost_usd: number;
}

// Student Referral Types
export interface LeaderboardAmbassador {
  user_id?: string;
  rank: number;
  name?: string;
  user_name?: string;
  referral_code?: string;
  referrals_count?: number;
  successful_referrals_count?: number;
  bonus_credits?: number;
}

export interface ReferralStatsResponse {
  user_code: string;
  referral_code?: string;
  rank?: number;
  referral_link?: string;
  bonus_credits: number;
  successful_referrals?: number;
  successful_referrals_count?: number;
  leaderboard: LeaderboardAmbassador[];
}

// Reverse Prompt Engineering Types
export interface ReverseEngineerResponse {
  system_prompt: string;
  user_prompt: string;
  reconstructed_prompt: string;
  detected_patterns: string[];
  confidence_score: number;
}

// Metaprompt & Constraints Types
export interface OptimizePromptRequest {
  raw_prompt: string;
  framework?: string;
  target_model_style?: string;
  rigor_level?: string;
}

export interface ExpandConstraintsResponse {
  draft_prompt: string;
  constraints: string[];
}

// Variable Template Types
export interface TemplateVariable {
  key?: string;
  name: string;
  label: string;
  default_value?: string | null;
}

// Encrypted Vault Types
export interface UserApiKeyItem {
  id: string;
  provider: string;
  masked_key?: string;
  created_at: string;
}

// Marketplace Types
export interface MarketplacePromptItem {
  id: number;
  author_name: string;
  title: string;
  description: string;
  prompt_payload: string;
  category: string;
  upvotes_count: number;
  forks_count: number;
  tags?: string[];
  is_upvoted?: boolean;
  has_upvoted?: boolean;
}

export interface MarketplaceListResponse {
  status: string;
  prompts: MarketplacePromptItem[];
}

// Token Compressor Types
export interface CompressPromptData {
  original_prompt: string;
  compressed_prompt: string;
  original_tokens: number;
  compressed_tokens: number;
  tokens_saved: number;
  savings_percentage: string;
  estimated_cost_delta_per_10k: number;
  removed_phrases: string[];
}

export interface CompressPromptResponse {
  status: string;
  data: CompressPromptData;
}

// GitHub & Vercel Deploy Types
export interface GitHubDeployRequest {
  project_id?: string;
  repo_name: string;
  github_token?: string;
  is_private?: boolean;
  prompt_text?: string;
  description?: string;
}

export interface GitHubDeployResponse {
  status: string;
  repo_name: string;
  repo_url: string;
  clone_url: string;
  vercel_deploy_url: string;
  is_private: boolean;
  files_created: string[];
  mode?: string;
}

// Team Workspace & Collaboration Types
export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  invited_email: string;
  created_at: string;
}

export interface CreateWorkspacePayload {
  name: string;
  owner_id?: string;
}

export interface InviteMemberPayload {
  email: string;
  role?: "owner" | "editor" | "viewer";
  inviter_id?: string;
}

// Enterprise Reliability & Guard Types
export interface PromptFeedbackPayload {
  project_id?: string;
  rating: "+1" | "-1";
  feedback_category?: "hallucination" | "poor_structure" | "slow" | "perfect" | string;
  user_edited_prompt?: string;
}

export interface PromptCacheInfo {
  cached?: boolean;
  cache_hit?: boolean;
  similarity_score?: number;
  cache_latency_ms?: number;
}

export interface PIIGuardAudit {
  pii_masked_count?: number;
  pii_warning?: string;
  pii_types?: string[];
}

export interface CircuitBreakerMetadata {
  fallback_triggered?: boolean;
  original_provider?: string;
  served_by?: string;
  circuit_state?: "CLOSED" | "OPEN" | "HALF_OPEN";
  failover_reason?: string;
}

export interface VoicePromptResponse {
  status: string;
  audio_filename: string;
  audio_size_bytes: number;
  transcribed_text: string;
  super_prompt: string;
  persona: string;
  framework: string;
}


