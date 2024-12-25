"use client"

import { Bell } from 'lucide-react'
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import UserProfile from "./user-profile"

export default function Header() {
  const { signOut } = useClerk()
  const router = useRouter()

  const handleSignOut = () => {
    signOut(() => router.push("/"))
  }

  return (
    <header className="flex items-center justify-between w-full px-6 py-4 border-b bg-background">
      <h1 className="text-2xl font-bold">Employee Dashboard</h1>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="hover:bg-accent hover:text-accent-foreground rounded-md p-2 transition-colors">
              <UserProfile />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
