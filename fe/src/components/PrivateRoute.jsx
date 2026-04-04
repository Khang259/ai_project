import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

function PrivateRoute({ children, requiredRole = null }) {
  const { auth } = useAuth();
  const token = localStorage.getItem("token");
  const user = auth?.user || null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', color: 'black' }}>
        <h2>Đang tải thông tin user...</h2>
        <p>Token: {token ? 'Có' : 'Không'}</p>
        <p>User: {user ? 'Có' : 'Không'}</p>
      </div>
    );
  }

  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasPermission = user.roles?.some(role => requiredRoles.includes(role));

    if (!hasPermission) {
      //console.log('User does not have required role', { userRoles: user.roles, requiredRoles });
      
      if (user.roles?.includes("user")) {
        return <Navigate to="/mobile-grid-display" replace />;
      }
      else {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  if (
    user.roles?.includes("user") &&
    !user.roles?.includes("admin")
  ) {
    if(user.username == "WE_user"){
      return <Navigate to="/caller-we" replace />;
    }   
    else {
      if (window.location.pathname !== "/mobile-grid-display") {
        return <Navigate to="/mobile-grid-display" replace />;
      }
    }
  }

  return children;
}

export default PrivateRoute;