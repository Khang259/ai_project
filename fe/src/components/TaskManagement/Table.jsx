import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Search, Calendar, Filter } from "lucide-react"
import { Calendar24 } from "./Calendar24"

// Định nghĩa các giá trị cho status, priority, label
const TASK_STATUS = ["Todo", "In Progress", "Done", "Canceled", "Backlog"]
const TASK_PRIORITY = ["Low", "Medium", "High"]

function getStatusColor(status) {
  switch (status) {
    case "Todo":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    case "In Progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "Done":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case "Canceled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    case "Backlog":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case "Low":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    case "Medium":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400"
    case "High":
      return "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
  }
}

function formatTimestamp(date) {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function TaskTable({ tasks, onTasksChange }) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const [selectedDateTime, setSelectedDateTime] = useState(null)
  const [taskIdFilter, setTaskIdFilter] = useState("")

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Tìm kiếm theo Task ID
    const matchesTaskId = !taskIdFilter || task.id.toLowerCase().includes(taskIdFilter.toLowerCase())
    
    // Tìm kiếm theo thời gian
    const matchesDate = (() => {
      if (!selectedDateTime) return true
      
      const taskDate = new Date(task.createdAt)
      const filterDateTime = new Date(selectedDateTime)
      
      // So sánh ngày và giờ chính xác - tasks được tạo từ thời điểm đã chọn trở đi
      return taskDate.getTime() >= filterDateTime.getTime()
    })()

    return matchesStatus && matchesPriority && matchesSearch && matchesTaskId && matchesDate
  })

  const handleSelectTask = (taskId, checked) => {
    const newSelected = new Set(selectedTasks)
    if (checked) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTasks(new Set(filteredTasks.map((task) => task.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }

  const handleDateTimeChange = (dateTime) => {
    setSelectedDateTime(dateTime)
  }

  const isAllSelected = filteredTasks.length > 0 && filteredTasks.every((task) => selectedTasks.has(task.id))
  const isIndeterminate = selectedTasks.size > 0 && !isAllSelected

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        {/* Search Row 1 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tiêu đề..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo Task ID..."
                value={taskIdFilter}
                onChange={(e) => setTaskIdFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {/* Filter Row 2 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="Todo">Todo</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
                <SelectItem value="Canceled">Canceled</SelectItem>
                <SelectItem value="Backlog">Backlog</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Độ ưu tiên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ưu tiên</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
            <Calendar24 
              onDateTimeChange={handleDateTimeChange}
              selectedDateTime={selectedDateTime}
            />
          </div>
        </div>
      </div>

      {selectedTasks.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {selectedTasks.size} công việc được chọn
          </p>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox className="border-2 border-neutral-500 hover:border-neutral-700 focus-visible:border-neutral-800 data-[state=checked]:border-primary"
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Chọn tất cả công việc"
                  {...(isIndeterminate && { "data-state": "indeterminate" })}
                />
              </TableHead>
              <TableHead>Công việc</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Checkbox className="border-2 border-neutral-500 hover:border-neutral-700 focus-visible:border-neutral-800 data-[state=checked]:border-primary"
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                    aria-label={`Chọn công việc ${task.id}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{task.id}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[500px]">
                  <div className="truncate" title={task.title}>
                    {task.title}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground" title={task.createdAt.toLocaleString()}>
                    {formatTimestamp(task.createdAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Mở menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                      <DropdownMenuItem>Nhân bản</DropdownMenuItem>
                      <DropdownMenuItem>Yêu thích</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Xóa</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {filteredTasks.length} / {tasks.length} công việc được hiển thị.
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Số dòng mỗi trang</p>
          <Select defaultValue="10">
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="40">40</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  )
}
