"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface DbUser {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
  avatar: string | null;
}

export default function ProfileForm() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { toast } = useToast();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [formData, setFormData] = useState<Partial<DbUser>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user");
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const userData = await response.json();
        setDbUser(userData);
        setFormData(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    if (isClerkLoaded && clerkUser) {
      fetchUser();
    }
  }, [isClerkLoaded, clerkUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          lastName: formData.lastName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedUser = await response.json();
      setDbUser(updatedUser);
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isClerkLoaded || isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-1/4 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500">Error loading profile: {error}</div>
      </Card>
    );
  }

  if (!dbUser || !formData) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            {dbUser.avatar ? (
              <div className="relative w-32 h-32">
                <Image
                  src={dbUser.avatar}
                  alt={`${dbUser.name}'s avatar`}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-4xl text-gray-500 font-medium">
                  {dbUser.name.charAt(0)}
                  {dbUser.lastName.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">Profile Picture</h2>
              <p className="text-sm text-muted-foreground">
                Your profile picture is managed through Clerk
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => window.location.href = "https://accounts.clerk.dev/user/profile"}
              >
                Change Picture on Clerk
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">First Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-muted-foreground">
                Email can only be changed through Clerk
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-muted-foreground">
                Role can only be changed by administrators
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
