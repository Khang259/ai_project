import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { Calendar24 } from "./Calendar24"

export default function TaskFilter({
    searchQuery,
    setSearchQuery,
    taskIdFilter,
    setTaskIdFilter,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    selectedDateTime,
    onDateTimeChange,
}) {
    return (
        <div className="flex flex-col gap-4 mb-6 mt-6 text-white">
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
                        <SelectTrigger className="w-[140px] glass">
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
                        <SelectTrigger className="w-[140px] glass">
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
                        onDateTimeChange={onDateTimeChange}
                        selectedDateTime={selectedDateTime}
                    />
                </div>
            </div>
        </div>
    )
}
