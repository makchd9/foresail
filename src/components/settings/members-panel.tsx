"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LinkIcon, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  changeMemberRoleAction,
  createInviteAction,
  leaveWorkspaceAction,
  removeMemberAction,
  revokeInviteAction,
} from "@/server/actions/members";
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTION, ROLE_LABEL, type Role } from "@/lib/rbac";
import { formatDate, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MemberRowData = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: Date;
};

export type InviteRowData = {
  id: string;
  role: Role;
  createdByName: string | null;
  expiresAt: Date;
};

export function MembersPanel({
  members,
  invites,
  canManage,
  isDemoWorkspace,
  currentUserId,
  currentRole,
}: {
  members: MemberRowData[];
  invites: InviteRowData[];
  canManage: boolean;
  isDemoWorkspace: boolean;
  currentUserId: string;
  currentRole: Role;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const manageEnabled = canManage && !isDemoWorkspace;

  function changeRole(membershipId: string, role: Role) {
    startTransition(async () => {
      const result = await changeMemberRoleAction(membershipId, role);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Role updated");
      router.refresh();
    });
  }

  function removeMember(member: MemberRowData) {
    startTransition(async () => {
      const result = await removeMemberAction(member.membershipId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Removed ${member.name}`);
      router.refresh();
    });
  }

  function revokeInvite(inviteId: string) {
    startTransition(async () => {
      const result = await revokeInviteAction(inviteId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invite revoked");
      router.refresh();
    });
  }

  function leave() {
    startTransition(async () => {
      const result = await leaveWorkspaceAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("You left the workspace");
      router.push("/app");
      router.refresh();
    });
  }

  const roleItems = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
        {manageEnabled ? <InviteDialogButton /> : null}
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const editable = manageEnabled && member.role !== "OWNER" && !isSelf;
          return (
            <li key={member.membershipId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.name}
                  {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Joined {formatDate(member.joinedAt)}
              </p>
              {editable ? (
                <Select
                  value={member.role}
                  items={roleItems}
                  onValueChange={(value) => value && changeRole(member.membershipId, value as Role)}
                  disabled={pending}
                >
                  <SelectTrigger size="sm" className="w-28" aria-label={`Role for ${member.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        <div>
                          <p>{item.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_DESCRIPTION[item.value as Role]}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{ROLE_LABEL[member.role]}</Badge>
              )}
              {editable ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${member.name}`}
                  disabled={pending}
                  onClick={() => removeMember(member)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {manageEnabled && invites.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-medium">Active invite links</h3>
          <ul className="divide-y rounded-xl border bg-card">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <LinkIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">
                  {ROLE_LABEL[invite.role]} invite
                  {invite.createdByName ? ` · by ${invite.createdByName}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  Expires {formatDate(invite.expiresAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => revokeInvite(invite.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Invite links are shown once when created — revoking kills the link immediately.
          </p>
        </div>
      ) : null}

      {isDemoWorkspace && canManage ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Member management is locked in the shared demo workspace. Sign up and invite people to
          your own workspace to try it.
        </p>
      ) : null}

      {currentRole !== "OWNER" && !isDemoWorkspace ? (
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <h3 className="text-sm font-semibold">Leave workspace</h3>
            <p className="text-sm text-muted-foreground">
              You&apos;ll lose access until someone invites you back.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={leave} disabled={pending}>
            <LogOut data-icon="inline-start" aria-hidden="true" />
            Leave
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function InviteDialogButton() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("MEMBER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const roleItems = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

  function create() {
    startTransition(async () => {
      const result = await createInviteAction(role);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setInviteUrl(result.data.url);
      router.refresh();
    });
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setInviteUrl(null);
          setCopied(false);
        }
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)}>
        <LinkIcon data-icon="inline-start" aria-hidden="true" />
        Invite via link
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to workspace</DialogTitle>
          <DialogDescription>
            Anyone with the link can join with the role you pick. Links expire in 7 days.
          </DialogDescription>
        </DialogHeader>
        {inviteUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteUrl} aria-label="Invite link" className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={copy} aria-label="Copy invite link">
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This is the only time the full link is shown — copy it now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Select value={role} items={roleItems} onValueChange={(v) => v && setRole(v as Role)}>
              <SelectTrigger className="w-full" aria-label="Invite role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <div>
                      <p>{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTION[item.value as Role]}
                      </p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={create} disabled={pending} className="w-full">
              {pending ? "Creating…" : "Create invite link"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
