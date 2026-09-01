"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ShoppingBag, Heart, Flower } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

const navLinks = [
    { href: "#categories", label: "Collections" },
    { href: "/catalog", label: "Shop All" },
    { href: "/custom-bouquet", label: "Custom Bouquet" },
    { href: "#about", label: "About" },
];

export function LandingNavbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                isScrolled
                    ? "bg-white/90 backdrop-blur-md shadow-sm shadow-pink-100/50"
                    : "bg-transparent",
            )}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-pink-300/50 transition-shadow">
                            <Flower size={16} className="text-white" />
                        </div>
                        <span className="font-playfair text-xl font-semibold text-rose-700 group-hover:text-rose-600 transition-colors">
                            Bloom
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            aria-label="Wishlist"
                            className="p-2 text-gray-400 hover:text-pink-500 transition-colors rounded-full hover:bg-pink-50"
                        >
                            <Heart size={20} />
                        </button>
                        <button
                            aria-label="Cart"
                            className="p-2 text-gray-400 hover:text-pink-500 transition-colors rounded-full hover:bg-pink-50"
                        >
                            <ShoppingBag size={20} />
                        </button>
                        <Button
                            asChild
                            size="sm"
                            className="ml-2 rounded-full px-5 bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-200"
                        >
                            <Link href="/catalog">Shop Now</Link>
                        </Button>
                    </div>

                    {/* Mobile toggle */}
                    <button
                        className="md:hidden p-2 text-gray-600 rounded-lg hover:bg-pink-50 transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-pink-100 px-4 py-5 shadow-lg">
                    <nav className="flex flex-col gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-base font-medium text-gray-700 hover:text-pink-600 transition-colors py-2.5 px-2 rounded-lg hover:bg-pink-50"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="flex gap-3 mt-3 pt-3 border-t border-pink-100">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-full border-pink-200 text-pink-600 hover:bg-pink-50"
                                asChild
                            >
                                <Link href="/catalog">
                                    <Heart size={16} className="mr-1" />
                                    Wishlist
                                </Link>
                            </Button>
                            <Button
                                className="flex-1 rounded-full bg-pink-500 hover:bg-pink-600 text-white"
                                asChild
                            >
                                <Link href="/catalog">Shop Now</Link>
                            </Button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
