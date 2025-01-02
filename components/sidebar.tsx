"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, BarChart2, MessageSquare, Settings, PlusCircle, List } from 'lucide-react'
import { useUser } from "@clerk/nextjs"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "./ui/sidebar"

export default function SidebarComponent() {
  const pathname = usePathname()
  const { user, isLoaded } = useUser()
  const userRole = user?.publicMetadata?.role as string

  useEffect(() => {
    if (isLoaded) {
      console.log('Detailed User Information:', {
        id: user?.id || 'Not logged in',
        email: user?.primaryEmailAddress?.emailAddress,
        firstName: user?.firstName,
        lastName: user?.lastName,
        role: userRole || 'undefined - Please set role in Clerk Dashboard',
        hasPublicMetadata: user?.publicMetadata !== undefined,
        fullPublicMetadata: user?.publicMetadata,
        isLoaded: isLoaded,
        timestamp: new Date().toISOString()
      })

      if (!userRole) {
        console.warn('Warning: No role defined for user. Please set role in Clerk Dashboard.')
      }
    }
  }, [user, userRole, isLoaded])

  // Define menu items based on user role
  const getMenuItems = () => {
    // If no role is set, only show basic items
    if (!userRole) {
      return [
        { 
          icon: Map, 
          label: "Map", 
          href: "/dashboard"
        },
        { icon: MessageSquare, label: "AI Chat", href: "/ai-chat" },
      ]
    }

    const baseItems = [
      { 
        icon: Map, 
        label: "Map", 
        href: "/dashboard",
        subItems: userRole !== 'org:employee' && userRole !== 'org:demo' ? [
          { icon: List, label: "Manage Branches", href: "/dashboard/manage" },
        ] : undefined
      },
      { icon: MessageSquare, label: "AI Chat", href: "/ai-chat" },
    ]

    // Add Settings for admin only
    if (userRole === 'org:admin') {
      baseItems.push({ icon: Settings, label: "Settings", href: "/settings" })
    }

    return baseItems
  }

  const menuItems = getMenuItems()

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <div key={item.href}>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === item.href}
                    >
                      <Link 
                        href={item.href} 
                        className="flex items-center justify-center lg:justify-start gap-2"
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="hidden lg:block">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {item.subItems && pathname.startsWith('/dashboard') && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <SidebarMenuItem key={subItem.href}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={pathname === subItem.href}
                          >
                            <Link 
                              href={subItem.href} 
                              className="flex items-center justify-center lg:justify-start gap-2 text-sm"
                            >
                              <subItem.icon className="h-4 w-4" />
                              <span className="hidden lg:block">{subItem.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
