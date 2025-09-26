import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "react-router-dom"

export function LoginForm() {
  const [email, setEmail] = useState("yatingzang0216@gmail.com")
  const [password, setPassword] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission here
    console.log("Form submitted:", { email, password, agreeToTerms })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-black">SIGN UP</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Welcome to the Smart Site System for Oil Depots. <br />
          Register as a member to experience.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-gray-700 font-medium">
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-gray-700 font-medium">
            Password
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

        {/* Terms Checkbox */}
        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="terms"
            checked={agreeToTerms}
            onCheckedChange={(checked) => setAgreeToTerms(Boolean(checked))}
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <label htmlFor="terms" className="text-sm text-gray-700">
            I agree to the terms of service
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          disabled={!agreeToTerms}
        >
          Create Account
        </Button>
      </form>

      {/* Sign In Link */}
      <div className="text-center pt-4">
        <span className="text-sm text-gray-600">Already a member? </span>
        <Link to="/signin" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Sign in
        </Link>
      </div>
    </div>
  )
}
