"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-6 shadow-lg w-fit",
        className
      )}
    >
      <DayPicker
        showOutsideDays
        classNames={{
          root: "w-full",

          /* ===== HEADER ===== */
          caption: "flex items-center justify-between mb-6 px-1 relative",

          caption_label: "text-lg font-semibold text-center flex-1",

          nav: "flex items-center gap-2",

          button_previous:
            "h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-200 transition shadow-sm hover:shadow",

          button_next:
            "h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-200 transition shadow-sm hover:shadow",

          /* ===== TABLE ===== */
          table: "w-full border-collapse table-fixed",

          head_row: "flex w-full",

          head_cell:
            "text-xs font-medium text-gray-400 pb-3 text-center w-10",

          row: "flex w-full mt-2",

          cell: "text-center w-10",

          day: "h-10 w-10 rounded-xl text-sm hover:bg-gray-100 transition",

          day_selected: "bg-black text-white hover:bg-black",

          day_today: "border border-black font-semibold",

          day_outside: "text-gray-300",

          day_disabled: "text-gray-300 opacity-50",
        }}
        components={{
          Chevron: ({ orientation, ...props }) =>
            orientation === "left" ? (
              <ChevronLeft {...props} className="h-6 w-6" />
            ) : (
              <ChevronRight {...props} className="h-6 w-6" />
            ),
        }}
        {...props}
      />
    </div>
  )
}