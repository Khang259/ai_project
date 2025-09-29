// src/components/LoginForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate(); // Initialize useNavigate

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ username, password });
      console.log("Login successful");
      navigate("/dashboard"); // Redirect to dashboard after successful login
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-black">Đăng nhập</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Liên hệ với quản lý nếu chưa có tài khoản.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Message */}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm text-gray-700 font-medium">
            Tên đăng nhập
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-12 px-4 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </div>
  );
}