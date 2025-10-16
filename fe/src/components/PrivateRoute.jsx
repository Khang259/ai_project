import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

function PrivateRoute({ children, requiredRole = null }) {
  const { auth } = useAuth();
  const token = localStorage.getItem("token");
  const user = auth?.user || null;

  if (!token) {
    console.log('❌ No token, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Nếu chưa có thông tin user, đợi load xong
  if (!user) {
    console.log('⏳ No user data, showing loading');
    return <div style={{ padding: '20px', background: 'yellow', color: 'black' }}>
      <h2>Đang tải thông tin user...</h2>
      <p>Token: {token ? 'Có' : 'Không'}</p>
      <p>User: {user ? 'Có' : 'Không'}</p>
    </div>;
  }

  // Nếu có requiredRole, kiểm tra quyền
  if (requiredRole) {
    if (!user.roles || !user.roles.includes(requiredRole)) {
      console.log('❌ User does not have required role, redirecting...');
      // Nếu không có quyền → redirect về trang phù hợp với role
      if (user.roles?.includes("user")) {
        return <Navigate to="/mobile-grid-display" replace />;
      } else{
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  // Kiểm tra role để redirect phù hợp - CHỈ redirect nếu KHÔNG phải đang ở mobile-grid-display
  if (user.roles?.includes("user") && !user.roles?.includes("admin") && !user.roles?.includes("superuser")) {
    if (window.location.pathname !== "/mobile-grid-display") {
      // Nếu là user thường và KHÔNG phải đang ở mobile-grid-display → redirect về mobile grid display
      return <Navigate to="/mobile-grid-display" replace />;
    }
  }
  return children;
}

export default PrivateRoute;
