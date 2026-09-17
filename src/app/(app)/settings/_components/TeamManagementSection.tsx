'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Mail, 
  Check, 
  Loader2, 
  AlertCircle, 
  Shield, 
  Sparkles,
  Lock,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Contact,
  FileText,
  Send,
  UserCheck
} from 'lucide-react';
import { Team, WorkspaceMember, WorkspaceInvitation, WorkspacePermissions } from '@/types';

interface TeamManagementSectionProps {
  tenant: any;
}

const DEFAULT_PERMISSIONS: WorkspacePermissions = {
  inbox_view: true,
  inbox_reply: true,
  inbox_assign: false,
  contacts_view: true,
  contacts_manage: false,
  templates_view: true,
  templates_manage: false,
  campaigns_create: false,
  campaigns_send: false,
  teams_manage: false,
  members_manage: false,
};

const ALL_ADMIN_PERMISSIONS: WorkspacePermissions = {
  inbox_view: true,
  inbox_reply: true,
  inbox_assign: true,
  contacts_view: true,
  contacts_manage: true,
  templates_view: true,
  templates_manage: true,
  campaigns_create: true,
  campaigns_send: true,
  teams_manage: true,
  members_manage: true,
};

export default function TeamManagementSection({ tenant }: TeamManagementSectionProps) {
  const isPro = tenant?.plan_type === 'pro' || tenant?.user_role === 'admin' || tenant?.user_role === 'superadmin';

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal 1: Create Team
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#4F46E5');
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Modal 2: Invite Member
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
  const [invitePermissions, setInvitePermissions] = useState<WorkspacePermissions>(DEFAULT_PERMISSIONS);
  const [showInvitePerms, setShowInvitePerms] = useState(true);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Modal 3: Edit Member
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null);
  const [editMemberRole, setEditMemberRole] = useState<'member' | 'admin'>('member');
  const [editMemberTeamIds, setEditMemberTeamIds] = useState<string[]>([]);
  const [editMemberPermissions, setEditMemberPermissions] = useState<WorkspacePermissions>(DEFAULT_PERMISSIONS);
  const [showEditPerms, setShowEditPerms] = useState(true);
  const [submittingMemberEdit, setSubmittingMemberEdit] = useState(false);

  const fetchTeamData = async () => {
    if (!isPro) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, membersRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/team-members')
      ]);

      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setTeams(tData.teams || []);
      }
      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.members || []);
        setInvitations(mData.invitations || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [tenant?.id, isPro]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSubmittingTeam(true);
    setError(null);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDescription.trim(),
          color: teamColor
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create team');
      } else {
        setSuccessMsg(`Team "${teamName}" created successfully!`);
        setShowCreateTeamModal(false);
        setTeamName('');
        setTeamDescription('');
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      }
    } catch (err: any) {
      setError(err?.message || 'Network error creating team');
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete the "${teamName}" team? Associated conversation assignments will be set to No Team.`)) return;

    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Team "${teamName}" deleted.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to delete team');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSubmittingInvite(true);
    setError(null);

    try {
      const res = await fetch('/api/team-members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          teamIds: inviteTeamIds,
          permissions: inviteRole === 'admin' ? ALL_ADMIN_PERMISSIONS : invitePermissions
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send invitation');
      } else {
        setSuccessMsg(data.message || `Invitation created for ${inviteEmail}`);
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteTeamIds([]);
        setInvitePermissions(DEFAULT_PERMISSIONS);
        setTimeout(() => setSuccessMsg(null), 5000);
        await fetchTeamData();
      }
    } catch (err: any) {
      setError(err?.message || 'Network error inviting member');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const openEditMemberModal = (m: WorkspaceMember) => {
    setEditingMember(m);
    setEditMemberRole(m.workspace_role || 'member');
    setEditMemberTeamIds(m.teams.map(t => t.id));
    setEditMemberPermissions(m.permissions || DEFAULT_PERMISSIONS);
    setShowEditPerms(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setSubmittingMemberEdit(true);

    try {
      const res = await fetch(`/api/team-members/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: editMemberTeamIds,
          workspace_role: editMemberRole,
          permissions: editMemberRole === 'admin' ? ALL_ADMIN_PERMISSIONS : editMemberPermissions
        })
      });

      if (res.ok) {
        setSuccessMsg(`Updated member access for ${editingMember.name}`);
        setEditingMember(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to update member');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setSubmittingMemberEdit(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;

    try {
      const res = await fetch(`/api/team-members/${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Member ${memberName} removed.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to remove member');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    }
  };

  const PRESET_COLORS = ['#4F46E5', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];

  // Helper renderer for permission checkboxes
  const renderPermissionGroup = (
    title: string,
    icon: React.ReactNode,
    items: { key: keyof WorkspacePermissions; label: string; desc?: string }[],
    currentPerms: WorkspacePermissions,
    onChange: (key: keyof WorkspacePermissions, val: boolean) => void
  ) => (
    <div className="space-y-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
        {icon}
        <span>{title}</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 pl-5">
        {items.map(item => (
          <label key={item.key} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(currentPerms[item.key])}
              onChange={(e) => onChange(item.key, e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
              {item.desc && <span className="block text-[10px] text-zinc-400">{item.desc}</span>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Teams &amp; Workspace Members</h2>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Pro
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Organize team members into departments (e.g. Sales, Support, Admissions) and manage granular workspace permissions.
            </p>
          </div>
        </div>

        {isPro && (
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={() => setShowCreateTeamModal(true)}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Team</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInviteModal(true);
                setInvitePermissions(DEFAULT_PERMISSIONS);
                setInviteRole('member');
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Invite Team Member</span>
            </button>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Non-Pro Plan Banner */}
      {!isPro && (
        <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Pro Feature: Multi-member Teams &amp; Shared Inbox</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed">
              Teams and conversation assignment allow multiple team members to collaborate on a single WhatsApp Business number under dedicated department queues.
            </p>
          </div>
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
            Available on Pro
          </span>
        </div>
      )}

      {/* Pro Content: Teams & Members Grid */}
      {isPro && (
        <div className="space-y-6">
          {/* Section A: Teams List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Teams ({teams.length})
            </h3>
            {teams.length === 0 ? (
              <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-2">
                <Users className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">No teams created yet</p>
                <p className="text-[11px] text-zinc-400">Create teams like &quot;Support&quot;, &quot;Sales&quot;, or &quot;Admissions&quot; to organize chats.</p>
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(true)}
                  className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Your First Team
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-start justify-between"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || '#4F46E5' }} />
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{t.name}</h4>
                      </div>
                      {t.description && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{t.description}</p>
                      )}
                      <span className="text-[10px] font-mono text-zinc-400 block pt-1">
                        {t.member_count || 0} {(t.member_count === 1) ? 'member' : 'members'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTeam(t.id, t.name)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Delete team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Workspace Members List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Workspace Members ({members.length})
            </h3>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
              {members.map((m) => {
                const isWorkspaceAdmin = m.workspace_role === 'admin';
                const isPlatformAdmin = m.role === 'admin' || m.role === 'superadmin';
                const isCurrentUser = m.id === tenant?.user_id || m.email === tenant?.user_email;

                return (
                  <div key={m.id} className="p-3.5 bg-white dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">{m.name}</span>
                          
                          {/* Current user indicator */}
                          {isCurrentUser && (
                            <span className="text-[10px] text-zinc-400 font-medium">(You)</span>
                          )}

                          {/* Workspace Role Badge */}
                          {isWorkspaceAdmin ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" /> Workspace Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              Team Member
                            </span>
                          )}

                          {/* Global Platform Admin Badge if applicable */}
                          {isPlatformAdmin && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" title="PingStack Global Admin">
                              Platform Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono block truncate">{m.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {m.teams.length > 0 ? (
                          m.teams.map((tm) => (
                            <span
                              key={tm.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider"
                              style={{
                                backgroundColor: `${tm.color || '#4F46E5'}15`,
                                color: tm.color || '#4F46E5',
                                border: `1px solid ${tm.color || '#4F46E5'}30`
                              }}
                            >
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tm.color || '#4F46E5' }} />
                              {tm.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">No teams assigned</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditMemberModal(m)}
                        className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit member access"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Disallow self-removal directly in the UI */}
                      {!isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id, m.name)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remove from workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: Pending Invitations */}
          {invitations.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Pending Invitations ({invitations.length})
              </h3>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                {invitations.map((inv) => (
                  <div key={inv.id} className="p-3 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <span className="font-mono text-zinc-800 dark:text-zinc-200">{inv.email}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {inv.role === 'admin' ? 'Workspace Admin' : 'Team Member'}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create Team */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Create New Team</h3>
              <button onClick={() => setShowCreateTeamModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admissions, Sales, Support"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Handles student onboarding queries"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Badge Color Selector — Fixed geometry, no layout jumping */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Badge Color</label>
                <div className="flex items-center gap-2.5 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTeamColor(c)}
                      aria-label={`Select color ${c}`}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                        teamColor === c ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : 'hover:opacity-85'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {teamColor === c && (
                        <Check className="w-3 h-3 text-white drop-shadow-xs" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
                >
                  {submittingTeam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Team</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Invite Team Member */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Invite Team Member</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Member Email *</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="member">Team Member</option>
                  <option value="admin">Workspace Admin</option>
                </select>
                <p className="text-[10px] text-zinc-400">
                  {inviteRole === 'admin' 
                    ? 'Workspace Admins have full access to manage chats, campaigns, templates, teams, and members.'
                    : 'Team Members have scoped access based on team membership and functional permissions below.'}
                </p>
              </div>

              {teams.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Assign Teams</label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    {teams.map((t) => {
                      const isSelected = inviteTeamIds.includes(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteTeamIds(prev => [...prev, t.id]);
                              } else {
                                setInviteTeamIds(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#4F46E5' }} />
                            {t.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Permissions Checklist — only shown for Team Member role */}
              {inviteRole === 'member' && (
                <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <div 
                    className="flex items-center justify-between cursor-pointer py-1"
                    onClick={() => setShowInvitePerms(!showInvitePerms)}
                  >
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer">Functional Permissions</label>
                    </div>
                    {showInvitePerms ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>

                  {showInvitePerms && (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {renderPermissionGroup(
                        'Inbox & Conversations',
                        <MessageSquare className="w-3 h-3 text-indigo-500" />,
                        [
                          { key: 'inbox_view', label: 'View conversations', desc: 'Can view chats assigned to their teams or unassigned queue' },
                          { key: 'inbox_reply', label: 'Reply to conversations', desc: 'Can send outbound replies to customer conversations' },
                          { key: 'inbox_assign', label: 'Assign / reassign conversations', desc: 'Can transfer chats between teams and members' }
                        ],
                        invitePermissions,
                        (k, v) => setInvitePermissions(p => ({ ...p, [k]: v }))
                      )}

                      {renderPermissionGroup(
                        'Contacts & Groups',
                        <Contact className="w-3 h-3 text-emerald-500" />,
                        [
                          { key: 'contacts_view', label: 'View contacts', desc: 'Can search and view workspace contact directory' },
                          { key: 'contacts_manage', label: 'Add & manage contacts', desc: 'Can create, import, or update customer contacts' }
                        ],
                        invitePermissions,
                        (k, v) => setInvitePermissions(p => ({ ...p, [k]: v }))
                      )}

                      {renderPermissionGroup(
                        'Templates',
                        <FileText className="w-3 h-3 text-blue-500" />,
                        [
                          { key: 'templates_view', label: 'View templates', desc: 'Can preview and select approved WhatsApp templates' },
                          { key: 'templates_manage', label: 'Create & edit templates', desc: 'Can author new templates for Meta submission' }
                        ],
                        invitePermissions,
                        (k, v) => setInvitePermissions(p => ({ ...p, [k]: v }))
                      )}

                      {renderPermissionGroup(
                        'Campaigns',
                        <Send className="w-3 h-3 text-amber-500" />,
                        [
                          { key: 'campaigns_create', label: 'Create campaigns', desc: 'Can create draft or scheduled broadcast campaigns' },
                          { key: 'campaigns_send', label: 'Send broadcast campaigns', desc: 'Can dispatch live template blasts to contact lists' }
                        ],
                        invitePermissions,
                        (k, v) => setInvitePermissions(p => ({ ...p, [k]: v }))
                      )}

                      {renderPermissionGroup(
                        'Administration',
                        <UserCheck className="w-3 h-3 text-purple-500" />,
                        [
                          { key: 'teams_manage', label: 'Manage teams', desc: 'Can create and delete departments' },
                          { key: 'members_manage', label: 'Manage members', desc: 'Can invite or update workspace team members' }
                        ],
                        invitePermissions,
                        (k, v) => setInvitePermissions(p => ({ ...p, [k]: v }))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
                >
                  {submittingInvite && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Member Access & Role */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Edit Member Access</h3>
                <p className="text-[11px] text-zinc-400 font-mono">{editingMember.email}</p>
              </div>
              <button onClick={() => setEditingMember(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Workspace Role</label>
                {(() => {
                  const totalAdmins = members.filter(mem => mem.workspace_role === 'admin' || mem.role === 'admin' || mem.role === 'superadmin').length;
                  const isSoleAdmin = (editingMember.workspace_role === 'admin' || editingMember.role === 'admin') && totalAdmins <= 1;

                  return (
                    <>
                      <select
                        value={editMemberRole}
                        disabled={isSoleAdmin}
                        onChange={(e) => setEditMemberRole(e.target.value as any)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                      >
                        <option value="admin">Workspace Admin</option>
                        {!isSoleAdmin && <option value="member">Team Member</option>}
                      </select>
                      {isSoleAdmin ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          ⚠️ This user is currently the only Workspace Admin. Promote another team member to Workspace Admin before changing this role.
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-400">
                          {editMemberRole === 'admin' 
                            ? 'Workspace Admins have full access across all workspace tools, teams, and members.'
                            : 'Team Members have scoped access based on their assigned teams and functional permissions below.'}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Assign to Teams</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  {teams.length === 0 ? (
                    <span className="text-[11px] text-zinc-400 italic">No teams exist yet</span>
                  ) : (
                    teams.map((t) => {
                      const isSelected = editMemberTeamIds.includes(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditMemberTeamIds(prev => [...prev, t.id]);
                              } else {
                                setEditMemberTeamIds(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#4F46E5' }} />
                            {t.name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Permissions Checklist — only shown when Role is Team Member */}
              {editMemberRole === 'member' && (
                <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <div 
                    className="flex items-center justify-between cursor-pointer py-1"
                    onClick={() => setShowEditPerms(!showEditPerms)}
                  >
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer">Functional Permissions</label>
                    </div>
                    {showEditPerms ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>

                  {showEditPerms && (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {renderPermissionGroup(
                        'Inbox & Conversations',
                        <MessageSquare className="w-3 h-3 text-indigo-500" />,
                        [
                          { key: 'inbox_view', label: 'View conversations', desc: 'Can view chats assigned to their teams or unassigned queue' },
                          { key: 'inbox_reply', label: 'Reply to conversations', desc: 'Can send outbound replies to customer conversations' },
                          { key: 'inbox_assign', label: 'Assign / reassign conversations', desc: 'Can transfer chats between teams and members' }
                        ],
                        editMemberPermissions,
                        (k, v) => setEditMemberPermissions(p => ({ ...p, [k]: v }))
                      )}

                      {renderPermissionGroup(
                        'Contacts & Groups',
                        <Contact className="w-3 h-3 text-emerald-500" />,
                        [
                          { key: 'contacts_view', label: 'View contacts', desc: 'Can search and view workspace contact directory' },
                          { key: 'contacts_manage', label: 'Add & manage contacts', desc: 'Can create, import, or update customer contacts' }
                        ],
                        editMemberPermissions,
                        (k, v) => setEditMemberPermissions(p => ({ ...p, [k]: v }))
                      )}

                      {renderPermissionGroup(
                        'Templates',
                        <FileText className="w-3 h-3 text-blue-500" />,
                        [
                          { key: 'templates_view', label: 'View templates', desc: 'Can preview and select approved WhatsApp templates' },
                          { key: 'templates_manage', label: 'Create & edit templates', desc: 'Can author new templates for Meta submission' }
                        ],
                        editMemberPermissions,
                        (k, v) => setEditMemberPermissions(p => ({ ...p, [k]: v }))
                      )}

                      {renderPermissionGroup(
                        'Campaigns',
                        <Send className="w-3 h-3 text-amber-500" />,
                        [
                          { key: 'campaigns_create', label: 'Create campaigns', desc: 'Can create draft or scheduled broadcast campaigns' },
                          { key: 'campaigns_send', label: 'Send broadcast campaigns', desc: 'Can dispatch live template blasts to contact lists' }
                        ],
                        editMemberPermissions,
                        (k, v) => setEditMemberPermissions(p => ({ ...p, [k]: v }))
                      )}

                      {renderPermissionGroup(
                        'Administration',
                        <UserCheck className="w-3 h-3 text-purple-500" />,
                        [
                          { key: 'teams_manage', label: 'Manage teams', desc: 'Can create and delete departments' },
                          { key: 'members_manage', label: 'Manage members', desc: 'Can invite or update workspace team members' }
                        ],
                        editMemberPermissions,
                        (k, v) => setEditMemberPermissions(p => ({ ...p, [k]: v }))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMemberEdit}
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
                >
                  {submittingMemberEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
