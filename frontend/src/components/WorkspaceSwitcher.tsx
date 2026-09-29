"use client";

import React, { useState, useEffect, useRef } from "react";
import { Users, Plus, ChevronDown, Check, UserPlus, Shield, Sparkles, X, Mail } from "lucide-react";
import { Workspace, WorkspaceMember } from "@/types/api";
import {
  fetchUserWorkspaces,
  createTeamWorkspace,
  inviteWorkspaceMember,
  fetchWorkspaceMembers
} from "@/lib/workspaceStore";
import { useAuth } from "@/components/auth-provider";

export function WorkspaceSwitcher() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "default_user";

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>({
    id: "personal",
    name: "Personal Workspace",
    owner_id: userId,
    role: "owner",
    created_at: new Date().toISOString(),
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const [newWsName, setNewWsName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "editor" | "viewer">("editor");

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const loadWorkspaces = async () => {
    const list = await fetchUserWorkspaces(userId);
    setWorkspaces(list);
  };

  useEffect(() => {
    void loadWorkspaces();
  }, [userId]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelectWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    setDropdownOpen(false);
    showToast(`Switched to ${ws.name}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("my-prompt:active-workspace-changed", { detail: { workspace: ws } }));
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    const ws = await createTeamWorkspace({ name: newWsName.trim(), owner_id: userId });
    if (ws) {
      setWorkspaces((prev) => [...prev, ws]);
      setActiveWorkspace(ws);
      setNewWsName("");
      setCreateModalOpen(false);
      showToast(`Created ${ws.name}!`);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) return;
    const member = await inviteWorkspaceMember(activeWorkspace.id, {
      email: inviteEmail.trim(),
      role: inviteRole,
      inviter_id: userId,
    });
    if (member) {
      setInviteEmail("");
      setInviteModalOpen(false);
      showToast(`Invited ${member.invited_email} as ${member.role}!`);
    }
  };

  const openInviteModal = async () => {
    setInviteModalOpen(true);
    setLoadingMembers(true);
    try {
      const list = await fetchWorkspaceMembers(activeWorkspace.id, userId);
      setMembers(list);
    } catch {}
    setLoadingMembers(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Toast popup */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* Switcher Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition shadow-sm"
      >
        <Users className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold text-white max-w-[120px] truncate">{activeWorkspace.name}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {activeWorkspace.role}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in duration-150">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800/80 mb-1">
            Workspaces
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                  activeWorkspace.id === ws.id ? "bg-indigo-600/20 text-indigo-300 font-semibold" : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{ws.name}</span>
                </div>
                {activeWorkspace.id === ws.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            ))}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
            {activeWorkspace.id !== "personal" && (
              <button
                onClick={openInviteModal}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite Team Member
              </button>
            )}

            <button
              onClick={() => {
                setDropdownOpen(false);
                setCreateModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Create Team Workspace
            </button>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Create Team Workspace
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Workspace Name</label>
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="e.g. AI Core Team"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                Cancel
              </button>
              <button onClick={handleCreateWorkspace} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20">
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" /> Invite Collaborator
              </h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Collaborator Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@organization.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Assigned RBAC Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none"
                >
                  <option value="editor">Editor (Can create & edit team prompts)</option>
                  <option value="viewer">Viewer (Can view & execute team prompts)</option>
                  <option value="owner">Owner (Full administrative control)</option>
                </select>
              </div>

              {members.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Current Members:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-300 font-mono text-[11px] truncate">{m.invited_email}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 uppercase">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setInviteModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                Cancel
              </button>
              <button onClick={handleInviteMember} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20">
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
