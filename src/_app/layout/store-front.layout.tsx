import {SidebarInset, SidebarProvider, SidebarTrigger} from "@/shared/ui";
import {AppSidebar} from "@/shared/components/app-sidebar";
import {UserDropDownMenu} from "@/src/entites/user/ui/user-dropdown";
import {LogOutButton} from "@/src/features/auth/logout";
import {Initializer} from "@/_app/initializer/initializer";

export async function StoreFrontLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const user = {
        id: "",
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    };
    return (
        <Initializer>
            <SidebarProvider>
                <AppSidebar>
                    <UserDropDownMenu
                        user={user}
                        logoutActionSlot={
                            <LogOutButton variant={"ghost"} size={"xs"} />
                        }
                    ></UserDropDownMenu>
                </AppSidebar>
                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1" />
                        </div>
                    </header>
                    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                        <div className="mx-auto w-full max-w-7xl">
                            {children}
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </Initializer>
    );
}
