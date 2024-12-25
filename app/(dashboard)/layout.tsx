import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { UserSync } from "@/components/user-sync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UserSync />
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b flex items-center justify-between px-6">
            <Link href="/dashboard" className="text-xl font-semibold">
              Employee Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
