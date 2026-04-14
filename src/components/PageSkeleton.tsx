import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";

// Skeleton for pages that display lists of items or cards
export function CardGridSkeleton() {
    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32 rounded-xl" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                        <div className="flex gap-3">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/4" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <Skeleton className="h-14 w-full rounded-xl" />
                             <Skeleton className="h-14 w-full rounded-xl" />
                        </div>
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Skeleton for lists/tables
export function ListSkeleton() {
    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32 rounded-xl" />
            </div>

            <div className="space-y-4 mt-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                         <Skeleton className="h-12 w-12 rounded-lg" />
                         <div className="space-y-2 flex-1">
                             <Skeleton className="h-5 w-1/4" />
                             <Skeleton className="h-4 w-1/3" />
                         </div>
                         <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PageSkeleton({ type = "grid" }: { type?: "grid" | "list" }) {
    if (type === "list") return <ListSkeleton />;
    return <CardGridSkeleton />;
}
