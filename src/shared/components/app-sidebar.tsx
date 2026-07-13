"use client";

import * as React from "react";
import { NavProjects } from "@/shared/components/nav-projects";
import { TeamSwitcher } from "@/shared/components/team-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/shared/ui";
import {
    AudioLinesIcon,
    BookOpenIcon,
    BotIcon,
    GalleryVerticalEndIcon,
    ListPlusIcon,
    Settings2Icon,
    TerminalIcon,
    TerminalSquareIcon,
    VectorSquareIcon,
} from "lucide-react";
import { APP_PAGE } from "@/shared/lib/constants/app-page.const";

// This is sample data.
const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    teams: [
        {
            name: "Acme Inc",
            logo: <GalleryVerticalEndIcon />,
            plan: "Enterprise",
        },
        {
            name: "Acme Corp.",
            logo: <AudioLinesIcon />,
            plan: "Startup",
        },
        {
            name: "Evil Corp.",
            logo: <TerminalIcon />,
            plan: "Free",
        },
    ],
    navMain: [
        {
            title: "Playground",
            url: "#",
            icon: <TerminalSquareIcon />,
            isActive: true,
            items: [
                {
                    title: "History",
                    url: "#",
                },
                {
                    title: "Starred",
                    url: "#",
                },
                {
                    title: "Settings",
                    url: "#",
                },
            ],
        },
        {
            title: "Models",
            url: "#",
            icon: <BotIcon />,
            items: [
                {
                    title: "Genesis",
                    url: "#",
                },
                {
                    title: "Explorer",
                    url: "#",
                },
                {
                    title: "Quantum",
                    url: "#",
                },
            ],
        },
        {
            title: "Documentation",
            url: "#",
            icon: <BookOpenIcon />,
            items: [
                {
                    title: "Introduction",
                    url: "#",
                },
                {
                    title: "Get Started",
                    url: "#",
                },
                {
                    title: "Tutorials",
                    url: "#",
                },
                {
                    title: "Changelog",
                    url: "#",
                },
            ],
        },
        {
            title: "Settings",
            url: "#",
            icon: <Settings2Icon />,
            items: [
                {
                    title: "General",
                    url: "#",
                },
                {
                    title: "Team",
                    url: "#",
                },
                {
                    title: "Billing",
                    url: "#",
                },
                {
                    title: "Limits",
                    url: "#",
                },
            ],
        },
    ],
    projects: [
        {
            name: "Catalog",
            url: APP_PAGE.Catalog,
            icon: <ListPlusIcon />,
        },
        {
            name: "Custom Bouquet",
            url: APP_PAGE.CustomBouquet,
            icon: <VectorSquareIcon />,
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                {/*<NavMain items={data.navMain} />*/}
                <NavProjects projects={data.projects} />
            </SidebarContent>
            <SidebarFooter>{props.children}</SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
