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
  UserCheck,
  Copy,
  RefreshCw,
  CheckCheck,
  Search,
  UserPlus,
  UserMinus,
  Settings,
  ArrowRight,
  User,
  Info
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

const PRESET_COLORS = ['#4F46E5', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];

export default function TeamManagementSection({ tenant }: TeamManagementSectionProps) {
  const isPro = tenant?.plan_type === 'pro' || tenant?.user_role === 'admin' || tenant?.user_role === 'superadmin';

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal: Create Team
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#4F46E5');
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Modal: Manage Team (Detailed view)
  const [managingTeam, setManagingTeam] = useState<Team | null>(null);
  const [teamMemberSearch, setTeamMemberSearch] = useState('');

  // Modal: Edit Team
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDescription, setEditTeamDescription] = useState('');
  const [editTeamColor, setEditTeamColor] = useState('#4F46E5');
  const [submittingTeamEdit, setSubmittingTeamEdit] = useState(false);

  // Modal: Add Existing Members to Team
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [selectedMemberIdsToAdd, setSelectedMemberIdsToAdd] = useState<string[]>([]);
  const [submittingAddMembers, setSubmittingAddMembers] = useState(false);

  // Modal: Invite Member (Global or Team-specific)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
  const [lockedTeam, setLockedTeam] = useState<Team | null>(null);
  const [invitePermissions, setInvitePermissions] = useState<WorkspacePermissions>(DEFAULT_PERMISSIONS);
  const [showInvitePerms, setShowInvitePerms] = useState(true);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Modal: Edit Member (Global)
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null);
  const [editMemberRole, setEditMemberRole] = useState<'member' | 'admin'>('member');
  const [editMemberTeamIds, setEditMemberTeamIds] = useState<string[]>([]);
  const [editMemberPermissions, setEditMemberPermissions] = useState<WorkspacePermissions>(DEFAULT_PERMISSIONS);
  const [showEditPerms, setShowEditPerms] = useState(true);
  const [submittingMemberEdit, setSubmittingMemberEdit] = useState(false);

  // Confirmation Dialogs
  const [invitationToRevoke, setInvitationToRevoke] = useState<WorkspaceInvitation | null>(null);
  const [submittingRevoke, setSubmittingRevoke] = useState(false);

  const [memberToRemoveFromTeam, setMemberToRemoveFromTeam] = useState<{
    teamId: string;
    teamName: string;
    memberId: string;
    memberName: string;
  } | null>(null);
  const [submittingRemoveFromTeam, setSubmittingRemoveFromTeam] = useState(false);

  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [submittingDeleteTeam, setSubmittingDeleteTeam] = useState(false);

  const [memberToRemoveFromWorkspace, setMemberToRemoveFromWorkspace] = useState<WorkspaceMember | null>(null);
  const [submittingRemoveWorkspaceMember, setSubmittingRemoveWorkspaceMember] = useState(false);

  // Pending invitation actions state
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTeamData = async () => {
    if (!isPro) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/team-members');
      if (res.ok) {
        const data = await res.json();
        const updatedTeams: Team[] = data.teams || [];
        setTeams(updatedTeams);
        setMembers(data.members || []);
        setInvitations(data.invitations || []);

        // If currently managing a team, refresh its reference
        if (managingTeam) {
          const freshManaging = updatedTeams.find(t => t.id === managingTeam.id);
          if (freshManaging) setManagingTeam(freshManaging);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to load team data');
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

  // Keep managingTeam state in sync when teams change
  useEffect(() => {
    if (managingTeam) {
      const found = teams.find(t => t.id === managingTeam.id);
      if (found) setManagingTeam(found);
    }
  }, [teams]);

  // --- Handlers: Team CRUD ---
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

  const openEditTeamModal = (t: Team) => {
    setEditingTeam(t);
    setEditTeamName(t.name);
    setEditTeamDescription(t.description || '');
    setEditTeamColor(t.color || '#4F46E5');
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editTeamName.trim()) return;
    setSubmittingTeamEdit(true);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editTeamName.trim(),
          description: editTeamDescription.trim(),
          color: editTeamColor
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update team');
      } else {
        setSuccessMsg(`Team "${editTeamName.trim()}" updated successfully.`);
        setEditingTeam(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      }
    } catch (err: any) {
      setError(err?.message || 'Network error updating team');
    } finally {
      setSubmittingTeamEdit(false);
    }
  };

  const handleConfirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    setSubmittingDeleteTeam(true);
    try {
      const res = await fetch(`/api/teams/${teamToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Team "${teamToDelete.name}" deleted. Team conversation assignments were reset to Unassigned.`);
        if (managingTeam?.id === teamToDelete.id) {
          setManagingTeam(null);
        }
        setTeamToDelete(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to delete team');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error deleting team');
    } finally {
      setSubmittingDeleteTeam(false);
    }
  };

  // --- Handlers: Team-Member Associations ---
  const handleAddMembersToTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingTeam || selectedMemberIdsToAdd.length === 0) return;
    setSubmittingAddMembers(true);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${managingTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedMemberIdsToAdd })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add members to team');
      } else {
        setSuccessMsg(data.message || `Members added to ${managingTeam.name}`);
        setShowAddMembersModal(false);
        setSelectedMemberIdsToAdd([]);
        setAddMemberSearch('');
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      }
    } catch (err: any) {
      setError(err?.message || 'Network error adding members to team');
    } finally {
      setSubmittingAddMembers(false);
    }
  };

  const handleConfirmRemoveFromTeam = async () => {
    if (!memberToRemoveFromTeam) return;
    setSubmittingRemoveFromTeam(true);
    setError(null);

    try {
      const { teamId, memberId, memberName, teamName } = memberToRemoveFromTeam;
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to remove member from team');
      } else {
        setSuccessMsg(`${memberName} removed from ${teamName}. They remain a workspace member.`);
        setMemberToRemoveFromTeam(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      }
    } catch (err: any) {
      setError(err?.message || 'Network error removing member from team');
    } finally {
      setSubmittingRemoveFromTeam(false);
    }
  };

  // --- Handlers: Global / Team Member Invitations ---
  const openGlobalInviteModal = () => {
    setLockedTeam(null);
    setInviteTeamIds([]);
    setInviteEmail('');
    setInviteRole('member');
    setInvitePermissions(DEFAULT_PERMISSIONS);
    setShowInviteModal(true);
  };

  const openTeamInviteModal = (team: Team) => {
    setLockedTeam(team);
    setInviteTeamIds([team.id]);
    setInviteEmail('');
    setInviteRole('member');
    setInvitePermissions(DEFAULT_PERMISSIONS);
    setShowInviteModal(true);
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
        setSuccessMsg(data.message || `Invitation sent to ${inviteEmail}`);
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteTeamIds([]);
        setLockedTeam(null);
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

  // --- Handlers: Workspace Member Edit & Removal ---
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
      setError(err?.message || 'Network error updating member');
    } finally {
      setSubmittingMemberEdit(false);
    }
  };

  const handleConfirmRemoveWorkspaceMember = async () => {
    if (!memberToRemoveFromWorkspace) return;
    setSubmittingRemoveWorkspaceMember(true);
    try {
      const res = await fetch(`/api/team-members/${memberToRemoveFromWorkspace.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Member ${memberToRemoveFromWorkspace.name} removed from workspace.`);
        setMemberToRemoveFromWorkspace(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to remove member');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setSubmittingRemoveWorkspaceMember(false);
    }
  };

  // --- Handlers: Invitations Resend & Revoke ---
  const handleResendInvitation = async (inv: WorkspaceInvitation) => {
    setResendingId(inv.id);
    setError(null);
    try {
      const res = await fetch('/api/team-members/invite/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: inv.id })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend invitation');
      } else {
        setSuccessMsg(data.message || `Invitation resent to ${inv.email}`);
        setTimeout(() => setSuccessMsg(null), 5000);
        await fetchTeamData();
      }
    } catch (err: any) {
      setError(err?.message || 'Network error resending invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!invitationToRevoke) return;
    setSubmittingRevoke(true);
    setError(null);
    try {
      const res = await fetch('/api/team-members/invite/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: invitationToRevoke.id })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to revoke invitation');
      } else {
        setSuccessMsg(data.message || `Invitation for ${invitationToRevoke.email} revoked.`);
        setInvitationToRevoke(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchTeamData();
      }
    } catch (err: any) {
      setError(err?.message || 'Network error revoking invitation');
    } finally {
      setSubmittingRevoke(false);
    }
  };

  const handleCopyInviteLink = (inv: WorkspaceInvitation) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/invite/${inv.token}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedId(inv.id);
      setSuccessMsg(`Copied invitation link for ${inv.email}`);
      setTimeout(() => setCopiedId(null), 2500);
      setTimeout(() => setSuccessMsg(null), 3500);
    }).catch(() => {
      setError('Could not copy to clipboard. Please copy link manually.');
    });
  };

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
              onClick={openGlobalInviteModal}
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

      {/* Pro Content: Teams, Members & Invitations */}
      {isPro && (
        <div className="space-y-6">
          {/* Section A: Teams List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Teams ({teams.length})
              </h3>
            </div>

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
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex flex-col justify-between transition-all group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: t.color || '#4F46E5' }} />
                          <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{t.name}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 shrink-0">
                          {t.member_count || 0} {(t.member_count === 1) ? 'member' : 'members'}
                        </span>
                      </div>
                      {t.description ? (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{t.description}</p>
                      ) : (
                        <p className="text-[11px] text-zinc-400 italic">No description provided</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-200/60 dark:border-zinc-700/50">
                      <button
                        type="button"
                        onClick={() => setManagingTeam(t)}
                        className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3 h-3" />
                        <span>Manage</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditTeamModal(t)}
                          className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit team details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamToDelete(t)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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
                          onClick={() => setMemberToRemoveFromWorkspace(m)}
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
                  <div key={inv.id} className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{inv.email}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {inv.role === 'admin' ? 'Workspace Admin' : 'Team Member'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {inv.teams && inv.teams.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {inv.teams.map((tm) => (
                                <span
                                  key={tm.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-bold rounded uppercase"
                                  style={{
                                    backgroundColor: `${tm.color || '#4F46E5'}15`,
                                    color: tm.color || '#4F46E5',
                                    border: `1px solid ${tm.color || '#4F46E5'}30`
                                  }}
                                >
                                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tm.color || '#4F46E5' }} />
                                  {tm.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">No team assigned</span>
                          )}
                          <span className="text-[10px] text-zinc-400 font-mono">
                            &bull; Expires {new Date(inv.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(inv)}
                        className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy invitation link"
                      >
                        {copiedId === inv.id ? (
                          <>
                            <CheckCheck className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-zinc-400" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={resendingId === inv.id}
                        onClick={() => handleResendInvitation(inv)}
                        className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Resend invitation email"
                      >
                        <RefreshCw className={`w-3 h-3 text-zinc-400 ${resendingId === inv.id ? 'animate-spin text-indigo-500' : ''}`} />
                        <span>Resend</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInvitationToRevoke(inv)}
                        className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-500/10 border border-zinc-200 dark:border-zinc-700 hover:border-red-500/30 rounded-lg text-[11px] font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Revoke invitation"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Manage Team (Detailed View) */}
      {/* ========================================================================= */}
      {managingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4 shrink-0 bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: managingTeam.color || '#4F46E5' }} />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">{managingTeam.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-200/70 dark:bg-zinc-700/70 text-zinc-700 dark:text-zinc-300">
                    {members.filter(m => m.teams.some(t => t.id === managingTeam.id)).length} members
                  </span>
                </div>
                {managingTeam.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{managingTeam.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditTeamModal(managingTeam)}
                  className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit Team</span>
                </button>
                <button
                  onClick={() => setManagingTeam(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-white dark:bg-zinc-900">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter team members..."
                  value={teamMemberSearch}
                  onChange={(e) => setTeamMemberSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMemberIdsToAdd([]);
                    setAddMemberSearch('');
                    setShowAddMembersModal(true);
                  }}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Add Members</span>
                </button>
                <button
                  type="button"
                  onClick={() => openTeamInviteModal(managingTeam)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Invite to Team</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Members List + Team Pending Invitations */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              {/* Subsection: Active Team Members */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Members in this Team
                  </h4>
                </div>

                {(() => {
                  const teamMembers = members.filter(m => m.teams.some(t => t.id === managingTeam.id));
                  const filtered = teamMembers.filter(m => 
                    m.name.toLowerCase().includes(teamMemberSearch.toLowerCase()) || 
                    m.email.toLowerCase().includes(teamMemberSearch.toLowerCase())
                  );

                  if (teamMembers.length === 0) {
                    return (
                      <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-2">
                        <Users className="w-8 h-8 text-zinc-400 mx-auto" />
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">No members in this team yet</p>
                        <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                          Add existing workspace members or invite new team members directly to this team.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberIdsToAdd([]);
                              setShowAddMembersModal(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Existing Members</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-center text-xs text-zinc-400">
                        No team members matching &quot;{teamMemberSearch}&quot;
                      </div>
                    );
                  }

                  return (
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filtered.map(m => {
                        const otherTeams = m.teams.filter(t => t.id !== managingTeam.id);
                        return (
                          <div key={m.id} className="p-3 bg-white dark:bg-zinc-900/40 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {m.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{m.name}</span>
                                  {m.workspace_role === 'admin' ? (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                      Admin
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                      Member
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                  <span className="text-[10px] text-zinc-400 font-mono">{m.email}</span>
                                  {otherTeams.length > 0 && (
                                    <span className="text-[10px] text-zinc-400">
                                      &bull; Also in: {otherTeams.map(t => t.name).join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setMemberToRemoveFromTeam({
                                teamId: managingTeam.id,
                                teamName: managingTeam.name,
                                memberId: m.id,
                                memberName: m.name
                              })}
                              className="px-2 py-1 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title="Remove from this team only"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Subsection: Team-Specific Pending Invitations */}
              {(() => {
                const teamInvites = invitations.filter(inv => {
                  const teamIds: string[] = Array.isArray(inv.team_ids) ? inv.team_ids : [];
                  const teamsList = inv.teams || [];
                  return teamIds.includes(managingTeam.id) || teamsList.some(t => t.id === managingTeam.id);
                });

                if (teamInvites.length === 0) return null;

                return (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Pending Invitations for {managingTeam.name} ({teamInvites.length})
                    </h4>
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                      {teamInvites.map(inv => (
                        <div key={inv.id} className="p-3 bg-zinc-50 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{inv.email}</span>
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {inv.role === 'admin' ? 'Workspace Admin' : 'Team Member'}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono block pt-0.5">
                                Expires {new Date(inv.expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleCopyInviteLink(inv)}
                              className="px-2 py-1 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3 text-zinc-400" />
                              <span>Copy</span>
                            </button>
                            <button
                              type="button"
                              disabled={resendingId === inv.id}
                              onClick={() => handleResendInvitation(inv)}
                              className="px-2 py-1 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 text-zinc-400 ${resendingId === inv.id ? 'animate-spin text-indigo-500' : ''}`} />
                              <span>Resend</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setInvitationToRevoke(inv)}
                              className="px-2 py-1 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-500/10 border border-zinc-200 dark:border-zinc-700 hover:border-red-500/30 rounded-lg text-[10px] font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end shrink-0 bg-zinc-50/50 dark:bg-zinc-800/30">
              <button
                type="button"
                onClick={() => setManagingTeam(null)}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Add Existing Members to Team */}
      {/* ========================================================================= */}
      {showAddMembersModal && managingTeam && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Add Members to &quot;{managingTeam.name}&quot;
                </h3>
                <p className="text-[11px] text-zinc-400">Select existing workspace members to assign to this team.</p>
              </div>
              <button onClick={() => setShowAddMembersModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search and Select All */}
            <div className="pt-3 pb-2 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search workspace members..."
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {(() => {
                const eligibleMembers = members.filter(m => !m.teams.some(t => t.id === managingTeam.id));
                const filtered = eligibleMembers.filter(m =>
                  m.name.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                  m.email.toLowerCase().includes(addMemberSearch.toLowerCase())
                );

                if (filtered.length > 0) {
                  const allVisibleSelected = filtered.every(m => selectedMemberIdsToAdd.includes(m.id));
                  return (
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newIds = Array.from(new Set([...selectedMemberIdsToAdd, ...filtered.map(m => m.id)]));
                              setSelectedMemberIdsToAdd(newIds);
                            } else {
                              const visibleIds = new Set(filtered.map(m => m.id));
                              setSelectedMemberIdsToAdd(prev => prev.filter(id => !visibleIds.has(id)));
                            }
                          }}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Select all visible ({filtered.length})</span>
                      </label>
                      <span>{selectedMemberIdsToAdd.length} selected</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Member Selection List */}
            <form onSubmit={handleAddMembersToTeam} className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800">
                {(() => {
                  const eligibleMembers = members.filter(m => !m.teams.some(t => t.id === managingTeam.id));
                  const filtered = eligibleMembers.filter(m =>
                    m.name.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                    m.email.toLowerCase().includes(addMemberSearch.toLowerCase())
                  );

                  if (eligibleMembers.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-zinc-400 space-y-1">
                        <Check className="w-6 h-6 text-emerald-500 mx-auto" />
                        <p className="font-medium text-zinc-600 dark:text-zinc-300">All workspace members are in this team</p>
                        <p className="text-[10px]">Use &quot;Invite to Team&quot; if you need to add a new person.</p>
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-zinc-400">
                        No members matching &quot;{addMemberSearch}&quot;
                      </div>
                    );
                  }

                  return filtered.map(m => {
                    const isSelected = selectedMemberIdsToAdd.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMemberIdsToAdd(prev => [...prev, m.id]);
                              } else {
                                setSelectedMemberIdsToAdd(prev => prev.filter(id => id !== m.id));
                              }
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 block truncate">{m.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono block truncate">{m.email}</span>
                          </div>
                        </div>

                        {m.teams.length > 0 ? (
                          <span className="text-[10px] text-zinc-400 shrink-0">
                            {m.teams.length} other {m.teams.length === 1 ? 'team' : 'teams'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic shrink-0">No teams</span>
                        )}
                      </label>
                    );
                  });
                })()}
              </div>

              <div className="flex gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddMembersModal(false)}
                  className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAddMembers || selectedMemberIdsToAdd.length === 0}
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submittingAddMembers && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    Add {selectedMemberIdsToAdd.length > 0 ? `${selectedMemberIdsToAdd.length} ` : ''}Members
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Edit Team (Name & Description) */}
      {/* ========================================================================= */}
      {editingTeam && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Edit Team Details</h3>
              <button onClick={() => setEditingTeam(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeam} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admissions, Sales, Support"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Handles student onboarding queries"
                  value={editTeamDescription}
                  onChange={(e) => setEditTeamDescription(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Badge Color Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Badge Color</label>
                <div className="flex items-center gap-2.5 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditTeamColor(c)}
                      aria-label={`Select color ${c}`}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
                        editTeamColor === c ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : 'hover:opacity-85'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {editTeamColor === c && (
                        <Check className="w-3 h-3 text-white drop-shadow-xs" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeamEdit}
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
                >
                  {submittingTeamEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Create New Team */}
      {/* ========================================================================= */}
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

              {/* Badge Color Selector */}
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

      {/* ========================================================================= */}
      {/* MODAL: Invite Member (Global or Direct-to-Team) */}
      {/* ========================================================================= */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {lockedTeam ? `Invite to "${lockedTeam.name}"` : 'Invite Team Member'}
                </h3>
              </div>
              <button onClick={() => { setShowInviteModal(false); setLockedTeam(null); }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
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

              {/* Team Assignment (Locked or Checkboxes) */}
              {lockedTeam ? (
                <div className="space-y-1.5 p-3 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200">Preassigned Team</span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Locked</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lockedTeam.color || '#4F46E5' }} />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{lockedTeam.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                    This member will automatically be added to the {lockedTeam.name} team upon accepting the invitation.
                  </p>
                </div>
              ) : (
                teams.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Assign Teams (Optional)</label>
                      <span className="text-[10px] text-zinc-400">Team assignment is optional</span>
                    </div>
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
                )
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
                  onClick={() => { setShowInviteModal(false); setLockedTeam(null); }}
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

      {/* ========================================================================= */}
      {/* MODAL: Edit Member Access & Role (Global) */}
      {/* ========================================================================= */}
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
                  const totalAdmins = members.filter(mem => mem.workspace_role === 'admin').length;
                  const isSoleAdmin = editingMember.workspace_role === 'admin' && totalAdmins <= 1;

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

      {/* ========================================================================= */}
      {/* DIALOG: Revoke Invitation Confirmation */}
      {/* ========================================================================= */}
      {invitationToRevoke && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Revoke Invitation</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{invitationToRevoke.email}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to revoke the invitation for <strong className="text-zinc-900 dark:text-white">{invitationToRevoke.email}</strong>? The invitation link will immediately be deactivated and can no longer be used to join the workspace.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvitationToRevoke(null)}
                className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRevoke}
                onClick={handleConfirmRevoke}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
              >
                {submittingRevoke && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Revoke Invitation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: Remove Member from Team Confirmation */}
      {/* ========================================================================= */}
      {memberToRemoveFromTeam && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Remove from Team</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{memberToRemoveFromTeam.memberName}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Remove <strong className="text-zinc-900 dark:text-white">{memberToRemoveFromTeam.memberName}</strong> from the <strong className="text-zinc-900 dark:text-white">{memberToRemoveFromTeam.teamName}</strong> team? They will remain an active member of this workspace.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemoveFromTeam(null)}
                className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRemoveFromTeam}
                onClick={handleConfirmRemoveFromTeam}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
              >
                {submittingRemoveFromTeam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Remove from Team</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: Delete Team Confirmation */}
      {/* ========================================================================= */}
      {teamToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Delete Team</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{teamToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to delete the <strong className="text-zinc-900 dark:text-white">&quot;{teamToDelete.name}&quot;</strong> team?
              <br />
              <span className="text-[11px] text-zinc-500 block pt-1">
                &bull; Workspace members in this team will NOT be deleted.
                <br />
                &bull; Active conversations assigned to this team will safely become Unassigned.
              </span>
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTeamToDelete(null)}
                className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDeleteTeam}
                onClick={handleConfirmDeleteTeam}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
              >
                {submittingDeleteTeam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Team</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: Remove Workspace Member Confirmation */}
      {/* ========================================================================= */}
      {memberToRemoveFromWorkspace && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Remove Member</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{memberToRemoveFromWorkspace.name} ({memberToRemoveFromWorkspace.email})</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to remove <strong className="text-zinc-900 dark:text-white">{memberToRemoveFromWorkspace.name}</strong> from this workspace? They will immediately lose access to workspace tools, conversations, and contacts.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemoveFromWorkspace(null)}
                className="flex-1 py-2 px-4 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingRemoveWorkspaceMember}
                onClick={handleConfirmRemoveWorkspaceMember}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5"
              >
                {submittingRemoveWorkspaceMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Remove Member</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
