// import { useAuth } from "../../contexts/AuthContext";

// export default function PermissionGate({ allow, children }) {
//   const { user } = useAuth();

//   // Chưa đăng nhập => không hiển thị
//   if (!user) return null;

//   // User không có role được phép => ẩn UI
//   const hasPermission = allow.some(role => user.roles.includes(role));
//   if (!hasPermission) return null;

//   return children;
// }
