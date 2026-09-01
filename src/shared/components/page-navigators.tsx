"use client";

import {SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem,} from "@/shared/ui";
import {NavigationItemVM} from "@/shared/lib/models";
import Link from "next/link";

export function PageNavigators({
    navItems,
}: {
    navItems:NavigationItemVM [];
}) {
    return (
        <SidebarGroup className="">
            <SidebarMenu>
                {navItems.map((item) => (
                    <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={item.isActive}>
                            <Link className={""} href={item.url}>
                                {item.icon}
                                <span>{item.name}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
