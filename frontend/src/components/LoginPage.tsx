"use client";

import { useState } from "react";
import { Button, Card, TextField, Label, Input, Form } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/AuthContext";

export function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      if (isRegister) {
        const firstName = form.get("first_name") as string;
        const lastName = form.get("last_name") as string;
        const displayName = form.get("display_name") as string;
        await register({ first_name: firstName, last_name: lastName, display_name: displayName, email, password });
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md vq-fade-in">
        <Card.Header className="flex-col items-center gap-2 pt-8 pb-2">
          <p className="text-2xl font-extrabold tracking-tight bg-linear-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
            Velvet Quasar
          </p>
          <Card.Description className="text-sm text-muted">
            {isRegister ? "Create your account" : "Sign in to continue"}
          </Card.Description>
        </Card.Header>
        <Card.Content className="px-8 pb-8">
          <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <TextField name="first_name" isRequired>
                    <Label>First Name</Label>
                    <Input placeholder="John" />
                  </TextField>
                  <TextField name="last_name" isRequired>
                    <Label>Last Name</Label>
                    <Input placeholder="Doe" />
                  </TextField>
                </div>
                <TextField name="display_name" isRequired>
                  <Label>Display Name</Label>
                  <Input placeholder="JohnD" />
                </TextField>
              </>
            )}
            <TextField name="email" type="email" isRequired>
              <Label>Email</Label>
              <Input placeholder="you@example.com" />
            </TextField>
            <TextField name="password" type="password" isRequired>
              <Label>Password</Label>
              <Input placeholder="Enter your password" />
            </TextField>

            {error && (
              <div className="flex items-center gap-2 text-danger text-sm">
                <Icon icon="lucide:alert-circle" width={16} />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" isDisabled={loading}>
              {loading ? (
                <Icon icon="lucide:loader-2" width={16} className="animate-spin" />
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </Form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsRegister((v) => !v); setError(""); }}
              className="text-sm text-accent hover:underline"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
            </button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
