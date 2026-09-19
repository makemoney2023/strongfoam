import { UserPlusIcon, UsersIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ops/action-form";
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
import { getOpsSession } from "@/lib/ops/auth";
import {
  MEMBERSHIP_ROLES,
  MEMBERSHIP_ROLE_LABELS,
} from "@/lib/ops/identity";
import { listUsers } from "@/lib/ops/store";
import { changeUserActive, createUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  if (!(await getOpsSession())) redirect("/app/login");
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Create the identities that can sign in to Field, then assign them to jobs or tasks."
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
            description="Create a field worker before assigning a scheduled job."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell>
                    {MEMBERSHIP_ROLE_LABELS[user.role]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.active ? "secondary" : "outline"}>
                      {user.active && user.membershipActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.createdAt.toLocaleDateString("en-CA")}</TableCell>
                  <TableCell className="text-right">
                    {user.active && user.membershipActive ? (
                      <ConfirmForm
                        action={changeUserActive}
                        message={`Deactivate ${user.displayName}? They will immediately lose Field access.`}
                      >
                        <input type="hidden" name="userId" value={user.userId} />
                        <input type="hidden" name="active" value="false" />
                        <SubmitButton
                          variant="outline"
                          className="min-h-11 md:min-h-8"
                          pendingLabel="Deactivating…"
                        >
                          Deactivate
                        </SubmitButton>
                      </ConfirmForm>
                    ) : (
                      <ActionForm action={changeUserActive}>
                        <input type="hidden" name="userId" value={user.userId} />
                        <input type="hidden" name="active" value="true" />
                        <SubmitButton
                          variant="outline"
                          className="min-h-11 md:min-h-8"
                          pendingLabel="Activating…"
                        >
                          Activate
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
