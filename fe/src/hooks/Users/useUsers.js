import { useState, useEffect, useMemo, useCallback } from "react";
import { getUsers, deleteUser, addUser, updateUser } from "@/services/users";

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
        console.log('data', data)
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
      const matchSearch = (u.username || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "" || (u.is_superuser ? "Admin" : "User" ) === roleFilter;
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

  const handleAddUser = useCallback(async (userData) => {
    try {
      setLoading(true);
      const newUser = await addUser(userData);
      // Refresh danh sách users sau khi thêm thành công
      const updatedUsers = await getUsers();
      setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
      console.log("Thêm user thành công:", newUser);
    } catch (err) {
      setError(err?.message || "Thêm người dùng thất bại");
      throw err; // Re-throw để component có thể handle
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateUser = useCallback(async (id, userData) => {
    try {
      await updateUser(id, userData);
      // Refresh danh sách sau khi cập nhật
      const updated = await getUsers();
      setUsers(Array.isArray(updated) ? updated : []);
    } catch (err) {
      setError(err?.message || "Cập nhật người dùng thất bại");
      throw err;
    } finally {
      setLoading(false);
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
    handleAddUser,
    handleUpdateUser,
    loading,
    error,
  };
};



