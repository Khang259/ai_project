import { useState, useEffect, useMemo, useCallback } from "react";
import { getUsers, deleteUser } from "@/services/users";

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(""); // "" = All

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message || "Không thể tải danh sách người dùng");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = (u.name || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleDelete = useCallback(async (id) => {
    if (!id) return;
    if (window.confirm("Xác nhận xóa user?")) {
      try {
        await deleteUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } catch (err) {
        setError(err?.message || "Xóa người dùng thất bại");
      }
    }
  }, []);

  return {
    users,
    setUsers,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    filteredUsers,
    handleDelete,
    loading,
    error,
  };
};



