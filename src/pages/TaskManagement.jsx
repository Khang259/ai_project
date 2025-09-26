import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import TaskTable from "@/components/TaskManagement/Table"

const mockTasks = [
  {
    id: "TASK-8782",
    title: "You can't compress the program without quantifying the open-source SSD pixel!",
    status: "In Progress",
    priority: "Medium",
    createdAt: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "TASK-7878",
    title: "Try to calculate the EXE feed, maybe it will index the multi-byte pixel!",
    status: "Backlog",
    priority: "Medium",
    createdAt: new Date("2024-01-14T14:20:00"),
  },
  {
    id: "TASK-7839",
    title: "We need to bypass the neural TCP card!",
    status: "Todo",
    priority: "High",
    createdAt: new Date("2024-01-16T09:15:00"),
  },
  {
    id: "TASK-5562",
    title: "The SAS interface is down, bypass the open-source pixel so we can back up the PNG bandwidth!",
    status: "Backlog",
    priority: "Medium",
    createdAt: new Date("2024-01-12T16:45:00"),
  },
  {
    id: "TASK-8686",
    title: "I'll parse the wireless SSL protocol, that should driver the API panel!",
    status: "Canceled",
    priority: "Medium",
    createdAt: new Date("2024-01-10T11:30:00"),
  },
  {
    id: "TASK-1280",
    title: "Use the digital TLS panel, then you can transmit the haptic system!",
    status: "Done",
    priority: "High",
    createdAt: new Date("2024-01-08T13:20:00"),
  },
  {
    id: "TASK-7262",
    title: "The UTF8 application is down, parse the neural bandwidth so we can back up the PNG firewall!",
    status: "Done",
    priority: "High",
    createdAt: new Date("2024-01-09T15:10:00"),
  },
  {
    id: "TASK-1138",
    title: "Generating the driver won't do anything, we need to quantify the 1080p SMTP bandwidth!",
    status: "In Progress",
    priority: "Medium",
    createdAt: new Date("2024-01-13T08:45:00"),
  },
  {
    id: "TASK-7184",
    title: "We need to program the back-end THX pixel!",
    status: "Todo",
    priority: "Low",
    createdAt: new Date("2024-01-17T12:00:00"),
  },
  {
    id: "TASK-5160",
    title: "Calculating the bus won't do anything, we need to navigate the back-end JSON protocol!",
    status: "In Progress",
    priority: "High",
    createdAt: new Date("2024-01-11T17:30:00"),
  },
]

export default function TasksPage() {
  const [tasks] = useState(mockTasks)

  const handleTasksChange = (newTasks) => {
    // Xử lý thay đổi tasks nếu cần
    console.log("Tasks changed:", newTasks)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold">Trang quản lý nhiệm vụ</CardTitle>
          {/* <CardDescription>Đây là danh sách các công việc của bạn trong tháng này.</CardDescription> */}
        </CardHeader>
        <CardContent>
          <TaskTable tasks={tasks} onTasksChange={handleTasksChange} />
        </CardContent>
      </Card>
    </div>
  )
}
