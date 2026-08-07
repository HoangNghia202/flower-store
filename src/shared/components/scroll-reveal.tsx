"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";

type Animation = "fade-up" | "fade-in" | "slide-left" | "slide-right" | "zoom-in";

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    animation?: Animation;
    /** Delay in milliseconds before the animation plays after entering the viewport. */
    delay?: number;
    threshold?: number;
}

const hiddenClasses: Record<Animation, string> = {
    "fade-up": "opacity-0 translate-y-8",
    "fade-in": "opacity-0",
    "slide-left": "opacity-0 -translate-x-8",
    "slide-right": "opacity-0 translate-x-8",
    "zoom-in": "opacity-0 scale-95",
};

export function ScrollReveal({
    children,
    className,
    animation = "fade-up",
    delay = 0,
    threshold = 0.12,
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Respect reduced-motion preference
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setIsVisible(true);
            return;
        }

        const el = ref.current;
        if (!el) return;

        let timer: ReturnType<typeof setTimeout>;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    timer = setTimeout(() => setIsVisible(true), delay);
                    observer.unobserve(el);
                }
            },
            { threshold },
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [delay, threshold]);

    return (
        <div
            ref={ref}
            className={cn(
                "transition-[opacity,transform] duration-700 ease-out",
                !isVisible && hiddenClasses[animation],
                className,
            )}
        >
            {children}
        </div>
    );
}
