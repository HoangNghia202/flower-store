"use client";

import * as React from "react";
import {PageNavigators} from "@/shared/components/page-navigators";
import {Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail,} from "@/shared/ui";
import {ListPlusIcon, VectorSquareIcon,} from "lucide-react";
import {APP_PAGE} from "@/shared/lib/constants/app-page.const";
import {usePathname} from "next/navigation";
import {NavigationItemVM} from "@/shared/lib/models";
import {useUserStore} from "@/_app/store/useUserStore";
import {UserRole} from "@/prisma/generated/enums";


const navUserItems: NavigationItemVM[] =
    [
        {
        name: "Catalog",
        url: APP_PAGE.Catalog,
        icon: <ListPlusIcon />,
        isActive:false
        },
        {
        name: "Custom Bouquet",
        url: APP_PAGE.CustomBouquet,
        icon: <VectorSquareIcon />,
        isActive:false
        },
    ]


const navAdminItems: NavigationItemVM[] =[]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const user = useUserStore(state => state.user)
    const location  = usePathname();

    const navigateItems = (user?.roles.includes(UserRole.ADMIN)? navAdminItems: navUserItems).map((item) => ({
        ...item,
        isActive: location.includes(item.url),
    }));

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                {/*NOTE: Store logo image here*/}
            </SidebarHeader>
            <SidebarContent>
                <PageNavigators navItems={navigateItems} />
            </SidebarContent>
            <SidebarFooter>{props.children}</SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
