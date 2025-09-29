import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token"); // hoặc context / redux

  if (!token) {
    // Nếu chưa login → redirect về /login
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
