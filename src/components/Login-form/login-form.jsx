import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "react-router-dom"

export function LoginForm() {
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission here
    console.log("Form submitted:", { account, password, agreeToTerms })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-black">Đăng nhập</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Liên hệ với quản lý nếu chưa có tài khoản. <br />
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="account" className="text-sm text-gray-700 font-medium">
            Tên đăng nhập
          </label>
          <Input
            id="account"
            type="account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="w-full h-12 px-4 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-gray-700 font-medium">
            Mật khẩu
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••••"
            required
          />
        </div>
        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
        >
          Đăng nhập
        </Button>
      </form>
    </div>
  )
}
