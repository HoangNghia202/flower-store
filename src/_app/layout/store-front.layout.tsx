import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/ui";
import { AppSidebar } from "@/shared/components/app-sidebar";
import { ThemeSwitcher } from "@/shared/components/theme-swicher";
import { UserDropDownMenu } from "@/src/entites/user/ui/user-dropdown";
import { auth } from "@/auth";
import { UserVM } from "@/src/entites/user/model";
import { LogOutButton } from "@/src/features/auth/logout";

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
                        {/*<Separator*/}
                        {/*    orientation="vertical"*/}
                        {/*    className="mr-2 data-vertical:h-4 data-vertical:self-auto"*/}
                        {/*/>*/}
                        {/*<Breadcrumb>*/}
                        {/*    <BreadcrumbList>*/}
                        {/*        <BreadcrumbItem className="hidden md:block">*/}
                        {/*            <BreadcrumbLink href="#">*/}
                        {/*                Build Your Application*/}
                        {/*            </BreadcrumbLink>*/}
                        {/*        </BreadcrumbItem>*/}
                        {/*        <BreadcrumbSeparator className="hidden md:block" />*/}
                        {/*        <BreadcrumbItem>*/}
                        {/*            <BreadcrumbPage>*/}
                        {/*                Data Fetching*/}
                        {/*            </BreadcrumbPage>*/}
                        {/*        </BreadcrumbItem>*/}
                        {/*    </BreadcrumbList>*/}
                        {/*</Breadcrumb>*/}
                    </div>
                    <div className="ml-auto px-5">
                        <ThemeSwitcher></ThemeSwitcher>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                        <div className="aspect-video rounded-xl bg-muted/50" />
                        <div className="aspect-video rounded-xl bg-muted/50" />
                        <div className="aspect-video rounded-xl bg-muted/50" />
                    </div>
                    <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
