"use client";

import { useState } from "react";
import { Button, Modal, TextField, Label, Input, Form } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/AuthContext";
import { apiUpdateProfile } from "@/lib/api";

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDialog({ isOpen, onClose }: ProfileDialogProps) {
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      await apiUpdateProfile({
        first_name: form.get("first_name") as string,
        last_name: form.get("last_name") as string,
        display_name: form.get("display_name") as string,
        email: form.get("email") as string,
      });
      await refreshUser();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Icon icon="lucide:user" className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Edit Profile</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleSubmit} id="profile-form" className="flex flex-col gap-4 p-1">
                <div className="grid grid-cols-2 gap-3">
                  <TextField name="first_name" defaultValue={user.first_name} isRequired>
                    <Label>First Name</Label>
                    <Input />
                  </TextField>
                  <TextField name="last_name" defaultValue={user.last_name} isRequired>
                    <Label>Last Name</Label>
                    <Input />
                  </TextField>
                </div>
                <TextField name="display_name" defaultValue={user.display_name} isRequired>
                  <Label>Display Name</Label>
                  <Input />
                </TextField>
                <TextField name="email" type="email" defaultValue={user.email} isRequired>
                  <Label>Email</Label>
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
              <Button type="submit" form="profile-form" isDisabled={loading}>
                {loading ? <Icon icon="lucide:loader-2" width={16} className="animate-spin" /> : "Save Changes"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
