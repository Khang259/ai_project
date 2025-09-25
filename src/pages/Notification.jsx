import { useState } from "react"
import {
  Plus,
  Search,
  Filter,
  Star,
  Download,
  Eye,
  Copy,
  MoreHorizontal,
  Zap,
  Database,
  Mail,
  Globe,
  ShoppingCart,
  Users,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

const Notification = [
  {
    id: 1,
    name: "E-commerce Order Processing",
    description: "Automated workflow for processing new orders, updating inventory, and sending notifications",
    category: "E-commerce",
    icon: ShoppingCart,
    rating: 4.8,
    downloads: 1247,
    tags: ["orders", "inventory", "notifications"],
    author: "Emma's Team",
    featured: true,
  },
  {
    id: 2,
    name: "Customer Onboarding",
    description: "Welcome new customers with automated email sequences and account setup",
    category: "CRM",
    icon: Users,
    rating: 4.6,
    downloads: 892,
    tags: ["onboarding", "email", "crm"],
    author: "Sarah Chen",
    featured: false,
  },
  {
    id: 3,
    name: "Data Backup & Sync",
    description: "Automatically backup and synchronize data across multiple platforms",
    category: "Data",
    icon: Database,
    rating: 4.9,
    downloads: 2156,
    tags: ["backup", "sync", "data"],
    author: "Michael Torres",
    featured: true,
  },
  {
    id: 4,
    name: "Social Media Publisher",
    description: "Schedule and publish content across multiple social media platforms",
    category: "Marketing",
    icon: Globe,
    rating: 4.5,
    downloads: 634,
    tags: ["social", "publishing", "marketing"],
    author: "Emma Wilson",
    featured: false,
  },
  {
    id: 5,
    name: "Email Campaign Automation",
    description: "Create and manage automated email marketing campaigns with analytics",
    category: "Marketing",
    icon: Mail,
    rating: 4.7,
    downloads: 1089,
    tags: ["email", "marketing", "automation"],
    author: "David Kim",
    featured: false,
  },
  {
    id: 6,
    name: "Meeting Scheduler",
    description: "Automatically schedule meetings and send calendar invites to participants",
    category: "Productivity",
    icon: Calendar,
    rating: 4.4,
    downloads: 567,
    tags: ["meetings", "calendar", "scheduling"],
    author: "Lisa Rodriguez",
    featured: false,
  },
]

const categories = [
  { name: "All", count: Notification.length },
  { name: "E-commerce", count: Notification.filter((t) => t.category === "E-commerce").length },
  { name: "CRM", count: Notification.filter((t) => t.category === "CRM").length },
  { name: "Data", count: Notification.filter((t) => t.category === "Data").length },
  { name: "Marketing", count: Notification.filter((t) => t.category === "Marketing").length },
  { name: "Productivity", count: Notification.filter((t) => t.category === "Productivity").length },
]

export default function NotificationPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredNotification = Notification.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "All" || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const featuredNotification = Notification.filter((t) => t.featured)

  return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notification</h1>
            <p className="text-gray-600 mt-1">Discover and use pre-built workflow Notification</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Plus className="w-4 h-4" />
              Create Notification
            </Button>
          </div>
        </div>

        {/* Search and Categories */}
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search notification..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.name)}
                className={selectedCategory === category.name ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                {category.name} ({category.count})
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse">Browse Notification</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="my-Notification">My Notification</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Notification Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotification.map((template) => (
                <Card key={template.id} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <template.icon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                            {template.featured && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Use Notification
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Star className="w-4 h-4 mr-2" />
                            Add to Favorites
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 line-clamp-2">{template.description}</CardDescription>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{template.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{template.downloads.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">by {template.author}</span>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Zap className="w-3 h-3 mr-1" />
                        Use Notification
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredNotification.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notification found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="featured" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredNotification.map((template) => (
                <Card key={template.id} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <template.icon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{template.description}</CardDescription>

                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{template.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{template.downloads.toLocaleString()}</span>
                      </div>
                    </div>

                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <Zap className="w-4 h-4 mr-2" />
                      Use Notification
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-Notification" className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Notification</h3>
              <p className="text-gray-600 mb-4">Create your first custom template to reuse your workflows.</p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Notification
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  )
}
