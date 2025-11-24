// "use client"

// import * as React from "react"
// import { ChevronDownIcon } from "lucide-react"

// import { Button } from "@/components/ui/button"
// import { Calendar } from "@/components/ui/calendar"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover"

// export function Calendar24({ onDateTimeChange, selectedDateTime }) {
//   const [open, setOpen] = React.useState(false)
//   const [dateTime, setDateTime] = React.useState(() => {
//     if (selectedDateTime) {
//       return new Date(selectedDateTime)
//     }
//     return new Date()
//   })

//   const handleDateSelect = (newDate) => {
//     if (newDate) {
//       // Giữ nguyên thời gian hiện tại, chỉ cập nhật ngày
//       const updatedDateTime = new Date(newDate)
//       updatedDateTime.setHours(dateTime.getHours())
//       updatedDateTime.setMinutes(dateTime.getMinutes())
//       updatedDateTime.setSeconds(dateTime.getSeconds())
      
//       setDateTime(updatedDateTime)
//       setOpen(false)
//       onDateTimeChange?.(updatedDateTime)
//     }
//   }

//   const handleTimeChange = (e) => {
//     const timeString = e.target.value
//     if (timeString) {
//       const [hours, minutes, seconds] = timeString.split(':').map(Number)
//       const updatedDateTime = new Date(dateTime)
//       updatedDateTime.setHours(hours || 0, minutes || 0, seconds || 0)
      
//       setDateTime(updatedDateTime)
//       onDateTimeChange?.(updatedDateTime)
//     }
//   }

//   const formatDateTime = (date) => {
//     if (!date) return "Chọn ngày và giờ"
    
//     const dateStr = date.toLocaleDateString("vi-VN")
//     const timeStr = date.toLocaleTimeString("vi-VN", {
//       hour: "2-digit",
//       minute: "2-digit",
//       second: "2-digit",
//       hour12: false
//     })
    
//     return `${dateStr} ${timeStr}`
//   }

//   const formatTimeForInput = (date) => {
//     if (!date) return "10:30:00"
    
//     return date.toLocaleTimeString("vi-VN", {
//       hour: "2-digit",
//       minute: "2-digit",
//       second: "2-digit",
//       hour12: false
//     })
//   }

//   return (
//     <div className="flex flex-col gap-3">
//       <Label htmlFor="datetime-picker" className="px-1">
//         Ngày và giờ
//       </Label>
//       <div className="flex gap-2">
//         <Popover open={open} onOpenChange={setOpen}>
//           <PopoverTrigger asChild>
//             <Button
//               variant="outline"
//               id="datetime-picker"
//               className="w-64 justify-between font-normal"
//             >
//               {formatDateTime(dateTime)}
//               <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
//             </Button>
//           </PopoverTrigger>
//           <PopoverContent className="w-auto p-0" align="start">
//             <Calendar
//               mode="single"
//               selected={dateTime}
//               onSelect={handleDateSelect}
//               captionLayout="dropdown"
//             />
//           </PopoverContent>
//         </Popover>
        
//         <Input
//           type="time"
//           step="1"
//           value={formatTimeForInput(dateTime)}
//           onChange={handleTimeChange}
//           className="w-32 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
//         />
//       </div>
//     </div>
//   )
// }
