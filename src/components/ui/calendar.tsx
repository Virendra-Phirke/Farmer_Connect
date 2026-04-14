import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "w-full rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/95",
        className,
      )}
      classNames={{
        months: "flex flex-col gap-4 sm:gap-5",
        month: "w-full space-y-4",
        caption: "relative flex items-center justify-center border-b border-slate-200 pb-3 pt-1 dark:border-slate-700",
        caption_label: "text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100",
        nav: "absolute inset-x-0 top-1 flex items-center justify-between px-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-lg border-slate-200 bg-white/90 p-0 text-slate-600 opacity-100 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100",
        ),
        nav_button_previous: "static",
        nav_button_next: "static",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell: "w-full rounded-md text-center text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
        row: "mt-1.5 flex w-full",
        cell: "relative h-10 w-full p-0 text-center text-sm sm:h-11 [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-slate-100/80 dark:[&:has([aria-selected].day-outside)]:bg-slate-800/40 [&:has([aria-selected])]:bg-slate-100/80 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg dark:[&:has([aria-selected])]:bg-slate-800/40 focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-lg p-0 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 aria-selected:opacity-100 sm:h-10 sm:w-10 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-slate-100",
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white dark:bg-emerald-500 dark:hover:bg-emerald-500 dark:focus:bg-emerald-500",
        day_today: "border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        day_outside:
          "day-outside text-slate-400 opacity-70 aria-selected:bg-slate-100 aria-selected:text-slate-500 aria-selected:opacity-80 dark:text-slate-500 dark:aria-selected:bg-slate-800 dark:aria-selected:text-slate-400",
        day_disabled: "text-slate-300 opacity-50 dark:text-slate-600",
        day_range_middle: "aria-selected:bg-emerald-100 aria-selected:text-emerald-800 dark:aria-selected:bg-emerald-900/40 dark:aria-selected:text-emerald-200",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
