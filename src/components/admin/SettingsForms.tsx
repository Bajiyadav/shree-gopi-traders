"use client";

import { changeAdminPasswordAction, updateAdminProfileAction } from "@/actions/admin-settings";
import { Card, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { ManagedForm } from "@/components/admin/common";

export function AdminSettingsForms({
  adminName,
  adminEmail,
}: {
  adminName: string;
  adminEmail: string;
}) {
  return (
    <>
      <Card className="p-5">
        <h2 className="text-base font-semibold">Admin Profile</h2>
        <ManagedForm action={updateAdminProfileAction} className="mt-5">
          {({ error }) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Display Name" htmlFor="name" error={error("name")} required>
                  <Input id="name" name="name" defaultValue={adminName} required />
                </Field>
                <Field label="Email" htmlFor="adminEmail" hint="Contact your developer to change this">
                  <Input id="adminEmail" defaultValue={adminEmail} disabled />
                </Field>
              </div>
              <div className="mt-4">
                <SubmitButton pendingText="Saving…">Save Profile</SubmitButton>
              </div>
            </>
          )}
        </ManagedForm>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold">Change Password</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          You will be signed out and need to sign in again with the new password.
        </p>
        <ManagedForm action={changeAdminPasswordAction} className="mt-5">
          {({ error }) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Current Password"
                  htmlFor="currentPassword"
                  error={error("currentPassword")}
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </Field>

                <Field
                  label="New Password"
                  htmlFor="newPassword"
                  error={error("newPassword")}
                  hint="At least 8 characters"
                  required
                >
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </Field>

                <Field
                  label="Confirm New Password"
                  htmlFor="confirmPassword"
                  error={error("confirmPassword")}
                  required
                >
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </Field>
              </div>
              <div className="mt-4">
                <SubmitButton pendingText="Updating…">Change Password</SubmitButton>
              </div>
            </>
          )}
        </ManagedForm>
      </Card>
    </>
  );
}
