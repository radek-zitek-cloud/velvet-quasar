"use client";

import { useState } from "react";
import { Button, Modal, TextField, Label, Input, Form } from "@heroui/react";
import { Icon } from "@iconify/react";
import { apiChangePassword } from "@/lib/api";

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordDialog({ isOpen, onClose }: PasswordDialogProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const currentPassword = form.get("current_password") as string;
    const newPassword = form.get("new_password") as string;
    const confirmPassword = form.get("confirm_password") as string;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await apiChangePassword(currentPassword, newPassword);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[400px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Icon icon="lucide:lock" className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Change Password</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleSubmit} id="password-form" className="flex flex-col gap-4 p-1">
                <TextField name="current_password" type="password" isRequired>
                  <Label>Current Password</Label>
                  <Input />
                </TextField>
                <TextField name="new_password" type="password" isRequired>
                  <Label>New Password</Label>
                  <Input />
                </TextField>
                <TextField name="confirm_password" type="password" isRequired>
                  <Label>Confirm New Password</Label>
                  <Input />
                </TextField>
                {error && (
                  <div className="flex items-center gap-2 text-danger text-sm">
                    <Icon icon="lucide:alert-circle" width={16} />
                    {error}
                  </div>
                )}
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" slot="close">Cancel</Button>
              <Button type="submit" form="password-form" isDisabled={loading}>
                {loading ? <Icon icon="lucide:loader-2" width={16} className="animate-spin" /> : "Change Password"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
