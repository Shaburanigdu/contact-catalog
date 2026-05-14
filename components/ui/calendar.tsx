"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react"
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addDays,
  type Locale,
} from "date-fns"
import { ru } from "date-fns/locale"
import { cn } from "@/lib/utils"

export interface CalendarProps {
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
  initialFocus?: boolean
  disabled?: (date: Date) => boolean
  locale?: Locale
}

export function Calendar({
  selected,
  onSelect,
  className,
  disabled,
  locale = ru,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => new Date())
  const [hoveredDay, setHoveredDay] = React.useState<Date | null>(null)

  // Генерация сетки дней для текущего месяца
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1, locale })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale })

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  // Дни недели (пн, вт, ср, чт, пт, сб, вс)
  const weekDays = React.useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(calendarStart, i)
      days.push(format(day, "EEEEEE", { locale }))
    }
    return days
  }, [calendarStart, locale])

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

  const handleSelect = (date: Date) => {
    if (disabled?.(date)) return
    onSelect?.(date)
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    onSelect?.(today)
  }

  const isSelected = (date: Date) => {
    return selected ? isSameDay(date, selected) : false
  }

  const isDisabled = (date: Date) => {
    return disabled ? disabled(date) : false
  }

  const isCurrentMonth = (date: Date) => {
    return isSameMonth(date, currentMonth)
  }

  // Количество пустых ячеек для выравнивания сетки (не нужно в eachDayOfInterval, но для отладки)
  // eachDayOfInterval уже дает полную 42-дневную сетку

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-800">
            {format(currentMonth, "LLLL yyyy", { locale })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            Сегодня
          </button>
          <div className="flex gap-1">
            <button
              onClick={handlePrevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-gray-100 hover:shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-gray-100 hover:shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-6 pt-3">
        {/* Week days */}
        <div className="mb-3 grid grid-cols-7 gap-1">
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              className="py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const isDayInMonth = isCurrentMonth(day)
            const daySelected = isSelected(day)
            const dayToday = isToday(day)
            const dayDisabled = isDisabled(day)
            const isHovered = hoveredDay && isSameDay(day, hoveredDay)

            return (
              <button
                key={idx}
                onClick={() => handleSelect(day)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                disabled={dayDisabled}
                className={cn(
                  "relative flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
                  // Базовые стили
                  !isDayInMonth && "text-gray-300",
                  !isDayInMonth && !dayDisabled && "hover:bg-gray-50",
                  // Стили для дней текущего месяца
                  isDayInMonth &&
                    !daySelected &&
                    !dayDisabled &&
                    "text-gray-700 hover:bg-gray-100 hover:shadow-sm",
                  // Стили для выбранного дня
                  daySelected &&
                    "bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md hover:from-blue-700 hover:to-blue-600",
                  // Стили для сегодняшнего дня (если не выбран)
                  dayToday &&
                    !daySelected &&
                    "border-2 border-blue-200 bg-blue-50 text-blue-700 font-semibold",
                  // Стили для disabled
                  dayDisabled && "cursor-not-allowed opacity-40",
                  // Hover эффект для выбранного (не меняем цвет)
                  isHovered && !daySelected && !dayDisabled && "bg-gray-100"
                )}
              >
                {format(day, "d")}
                {/* Точка под сегодняшним днем (декор) */}
                {dayToday && !daySelected && (
                  <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-gray-100 px-6 py-3">
        <p className="text-center text-xs text-gray-400">
          {selected
            ? `Выбрано: ${format(selected, "dd MMMM yyyy", { locale })}`
            : "Нажмите на дату для выбора"}
        </p>
      </div>
    </div>
  )
}