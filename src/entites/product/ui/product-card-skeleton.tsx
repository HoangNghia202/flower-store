import { Skeleton } from "@/shared/ui";

export function ProductCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-pink-100">
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-8 w-full" />
            </div>
        </div>
    );
}
