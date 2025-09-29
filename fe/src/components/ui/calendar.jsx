import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

export function Calendar({ date, setDate }) {
  return (
    <DayPicker
      mode="single"
      selected={date}
      onSelect={setDate}
      captionLayout="dropdown"   // chỉ dùng cái này, không override Caption nữa
      fromYear={2000}
      toYear={2030}
      ISOWeek
    />
  )
}
