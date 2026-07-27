"use client";

import Link from "next/link";
import { useCartStore } from "@/_app/store/useCartStore";
import { useUserStore } from "@/_app/store/useUserStore";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/ui";
import { ShoppingBagIcon } from "lucide-react";
import { LogOutButton } from "@/src/features/auth/logout";
import { APP_PAGE } from "@/shared/lib/constants/app-page.const";

const NAV_LINKS = [
    { label: "Home", href: "/" },
    { label: "Shop", href: APP_PAGE.Catalog },
    { label: "Gallery", href: "/gallery" },
    { label: "Custom Bouquet", href: APP_PAGE.CustomBouquet },
];

export function Navbar() {
    const totalItems = useCartStore((s) => s.getTotalItems());
    const user = useUserStore((s) => s.user);

    return (
        <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-1 text-lg font-semibold tracking-tight">
                    <span className="text-gray-900">Floral</span>
                    <span className="text-brand-rose italic font-display"> Vibes</span>
                </Link>

                {/* Nav links */}
                <nav className="hidden items-center gap-8 md:flex">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm text-gray-500 transition-colors hover:text-brand-rose"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Right: Cart + Auth */}
                <div className="flex items-center gap-4">
                    {/* Cart */}
                    <Link
                        href="/cart"
                        className="relative flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-rose transition-colors"
                        aria-label="Cart"
                    >
                        <ShoppingBagIcon className="size-4" />
                        <span>Cart</span>
                        {totalItems > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-rose text-[10px] font-bold text-white">
                                {totalItems > 9 ? "9+" : totalItems}
                            </span>
                        )}
                    </Link>

                    {/* Auth */}
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-rose/50">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="bg-brand-blush text-brand-rose text-xs font-semibold">
                                            {user.name?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="font-normal">
                                    <p className="font-medium text-sm truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <LogOutButton variant="ghost" size="sm" className="w-full justify-start" />
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link
                            href={APP_PAGE.Login}
                            className="text-sm text-gray-600 hover:text-brand-rose transition-colors"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}

