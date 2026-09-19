import {
  HistoryIcon,
  KeyRoundIcon,
  PencilIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { EmptyState } from "@/components/ops/empty-state";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canManageUsers, getOpsSession } from "@/lib/ops/auth";
import {
  MEMBERSHIP_ROLES,
  MEMBERSHIP_ROLE_LABELS,
} from "@/lib/ops/identity";
import {
  getUserAssignmentSummary,
  listUserEvents,
  listUsers,
} from "@/lib/ops/store";
import {
  changeUserActive,
  createUser,
  resetUserPassword,
  revokeUserSessions,
  updateUser,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!canManageUsers(session)) redirect("/app");
  const [users, events] = await Promise.all([listUsers(), listUserEvents(25)]);
  const assignmentEntries = await Promise.all(
    users.map(async (user) => [
      user.userId,
      await getUserAssignmentSummary(user.userId),
    ] as const),
  );
  const assignmentsByUser = new Map(assignmentEntries);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage individual Office and Field access, roles, credentials, and sessions."
        actions={
          <FormDialog
            triggerLabel="Add user"
            triggerIcon={<UserPlusIcon aria-hidden="true" />}
            title="Create a user"
            description="Field users sign in separately. Share the temporary password through an approved private channel."
          >
            <ActionForm action={createUser} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-displayName">Name</Label>
                <Input
                  id="user-displayName"
                  name="displayName"
                  className="h-11"
                  maxLength={120}
                  required
                />
                <FieldError name="displayName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  name="email"
                  type="email"
                  className="h-11"
                  maxLength={320}
                  required
                />
                <FieldError name="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <NativeSelect
                  id="user-role"
                  name="role"
                  defaultValue="field_worker"
                  className="h-11"
                >
                  {MEMBERSHIP_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {MEMBERSHIP_ROLE_LABELS[role]}
                    </option>
                  ))}
                </NativeSelect>
                <FieldError name="role" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Temporary password</Label>
                <Input
                  id="user-password"
                  name="temporaryPassword"
                  type="password"
                  className="h-11"
                  minLength={12}
                  autoComplete="new-password"
                  required
                />
                <FieldError name="temporaryPassword" />
                <p className="text-xs text-muted-foreground">
                  At least 12 characters with a letter and number.
                </p>
              </div>
              <div className="sm:col-span-2">
                <SubmitButton
                  className="min-h-11 w-full sm:w-auto"
                  pendingLabel="Creating user…"
                >
                  Create user
                </SubmitButton>
              </div>
            </ActionForm>
          </FormDialog>
        }
      />

      <Card>
        {users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon aria-hidden="true" />}
            title="No application users"
            description="Create an administrator, Office user, or field worker."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const assignments = assignmentsByUser.get(user.userId) ?? {
                  jobAssignments: 0,
                  taskAssignments: 0,
                };
                const isCurrentUser =
                  "userId" in session && session.userId === user.userId;
                return (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {user.createdAt.toLocaleDateString("en-CA")}
                      </p>
                    </TableCell>
                    <TableCell>
                      {MEMBERSHIP_ROLE_LABELS[user.role]}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {assignments.jobAssignments} jobs ·{" "}
                        {assignments.taskAssignments} tasks
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.active && user.membershipActive
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {user.active && user.membershipActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.updatedAt.toLocaleDateString("en-CA")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <FormDialog
                          triggerLabel="Edit"
                          triggerIcon={<PencilIcon aria-hidden="true" />}
                          triggerVariant="outline"
                          title={`Edit ${user.displayName}`}
                          description="Profile or role changes revoke existing sessions."
                        >
                          <ActionForm action={updateUser} className="space-y-4">
                            <input
                              type="hidden"
                              name="userId"
                              value={user.userId}
                            />
                            <div className="space-y-2">
                              <Label htmlFor={`displayName-${user.userId}`}>
                                Name
                              </Label>
                              <Input
                                id={`displayName-${user.userId}`}
                                name="displayName"
                                defaultValue={user.displayName}
                                maxLength={120}
                                required
                              />
                              <FieldError name="displayName" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`email-${user.userId}`}>
                                Email
                              </Label>
                              <Input
                                id={`email-${user.userId}`}
                                name="email"
                                type="email"
                                defaultValue={user.email}
                                maxLength={320}
                                required
                              />
                              <FieldError name="email" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`role-${user.userId}`}>Role</Label>
                              <NativeSelect
                                id={`role-${user.userId}`}
                                name="role"
                                defaultValue={user.role}
                              >
                                {MEMBERSHIP_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {MEMBERSHIP_ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </NativeSelect>
                              <FieldError name="role" />
                              {assignments.jobAssignments +
                                assignments.taskAssignments >
                              0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Resolve field assignments before changing this
                                  user to an Office role.
                                </p>
                              ) : null}
                            </div>
                            <SubmitButton pendingLabel="Saving…">
                              Save user
                            </SubmitButton>
                          </ActionForm>
                        </FormDialog>

                        <FormDialog
                          triggerLabel="Reset password"
                          triggerIcon={<KeyRoundIcon aria-hidden="true" />}
                          triggerVariant="outline"
                          title={`Reset ${user.displayName}'s password`}
                          description="This immediately revokes all existing sessions."
                        >
                          <ActionForm
                            action={resetUserPassword}
                            className="space-y-4"
                          >
                            <input
                              type="hidden"
                              name="userId"
                              value={user.userId}
                            />
                            <div className="space-y-2">
                              <Label htmlFor={`password-${user.userId}`}>
                                Temporary password
                              </Label>
                              <Input
                                id={`password-${user.userId}`}
                                name="temporaryPassword"
                                type="password"
                                minLength={12}
                                autoComplete="new-password"
                                required
                              />
                              <FieldError name="temporaryPassword" />
                              <p className="text-xs text-muted-foreground">
                                At least 12 characters with a letter and number.
                              </p>
                            </div>
                            <SubmitButton pendingLabel="Resetting…">
                              Reset password
                            </SubmitButton>
                          </ActionForm>
                        </FormDialog>

                        <ConfirmForm
                          action={revokeUserSessions}
                          message={`Revoke every active session for ${user.displayName}?`}
                        >
                          <input
                            type="hidden"
                            name="userId"
                            value={user.userId}
                          />
                          <SubmitButton
                            variant="outline"
                            pendingLabel="Revoking…"
                          >
                            Revoke sessions
                          </SubmitButton>
                        </ConfirmForm>

                        {isCurrentUser ? (
                          <Badge variant="outline">Current user</Badge>
                        ) : user.active && user.membershipActive ? (
                          <ConfirmForm
                            action={changeUserActive}
                            message={`Deactivate ${user.displayName}? They will immediately lose Office and Field access.`}
                          >
                            <input
                              type="hidden"
                              name="userId"
                              value={user.userId}
                            />
                            <input type="hidden" name="active" value="false" />
                            <SubmitButton
                              variant="outline"
                              pendingLabel="Deactivating…"
                            >
                              Deactivate
                            </SubmitButton>
                          </ConfirmForm>
                        ) : (
                          <ActionForm action={changeUserActive}>
                            <input
                              type="hidden"
                              name="userId"
                              value={user.userId}
                            />
                            <input type="hidden" name="active" value="true" />
                            <SubmitButton
                              variant="outline"
                              pendingLabel="Activating…"
                            >
                              Activate
                            </SubmitButton>
                          </ActionForm>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 size-5" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Recent user activity</h2>
            <p className="text-sm text-muted-foreground">
              Profile, role, access, credential, and session changes.
            </p>
          </div>
        </div>
        {events.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon aria-hidden="true" />}
            title="No user activity yet"
            description="User lifecycle changes will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    {event.createdAt.toLocaleString("en-CA")}
                  </TableCell>
                  <TableCell>
                    {users.find((user) => user.userId === event.userId)
                      ?.displayName ?? "Unknown user"}
                  </TableCell>
                  <TableCell>{event.summary}</TableCell>
                  <TableCell>{event.actor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
