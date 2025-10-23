import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import TaskTable from "@/components/TaskManagement/Table"
import { useArea } from "@/contexts/AreaContext"

const mockTasks = [
  {
    id: "TASK-8782",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "In Progress",
    priority: "Medium",
    createdAt: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "TASK-7878",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "Backlog",
    priority: "Medium",
    createdAt: new Date("2024-01-14T14:20:00"),
  },
  {
    id: "TASK-7839",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "Todo",
    priority: "High",
    createdAt: new Date("2024-01-16T09:15:00"),
  },
  {
    id: "TASK-5562",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "Backlog",
    priority: "Medium",
    createdAt: new Date("2024-01-12T16:45:00"),
  },
  {
    id: "TASK-8686",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "Canceled",
    priority: "Medium",
    createdAt: new Date("2024-01-10T11:30:00"),
  },
  {
    id: "TASK-1280",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "Done",
    priority: "High",
    createdAt: new Date("2024-01-08T13:20:00"),
  },
  {
    id: "TASK-7262",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "Done",
    priority: "High",
    createdAt: new Date("2024-01-09T15:10:00"),
  },
  {
    id: "TASK-1138",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "In Progress",
    priority: "Medium",
    createdAt: new Date("2024-01-13T08:45:00"),
  },
  {
    id: "TASK-7184",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "Todo",
    priority: "Low",
    createdAt: new Date("2024-01-17T12:00:00"),
  },
  {
    id: "TASK-5160",
    title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    status: "In Progress",
    priority: "High",
    createdAt: new Date("2024-01-11T17:30:00"),
  },
]

export default function TasksPage() {
  const [tasks] = useState(mockTasks)
  const { currAreaName, currAreaId } = useArea()

  const handleTasksChange = (newTasks) => {
    // Xử lý thay đổi tasks nếu cần
    console.log("Tasks changed:", newTasks)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold">Trang quản lý nhiệm vụ</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskTable tasks={tasks} onTasksChange={handleTasksChange} />
        </CardContent>
      </Card>
    </div>
  )
}
