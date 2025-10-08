// src/pages/Users.jsx
import React, { useState } from "react";
import { toast } from "sonner";
import UsersHeader from "@/components/Users/UsersHeader";
import UsersFilters from "@/components/Users/UsersFilters";
import UsersTable from "@/components/Users/UsersTable";
import AddUserModal from "@/components/Users/AddUserModal";
import { useUsers } from "@/hooks/Users/useUsers";
import Username from "@/components/Users/username";
import { useArea } from "@/contexts/AreaContext";

export default function UserDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { currAreaName, currAreaId } = useArea();
  
  const {
    users,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    filteredUsers,
    handleDelete,
    handleAddUser,
    loading,
    error,
  } = useUsers();

  if (loading) return <div className="p-6">Đang tải danh sách người dùng...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const handleAddUserSubmit = async (userData) => {
    try {
      await handleAddUser(userData);
      toast.success("Thêm người dùng thành công");
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Lỗi khi thêm user:", error);
      toast.error(error?.message || "Thêm người dùng thất bại");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <UsersHeader onAdd={() => setIsAddModalOpen(true)} />

      <UsersFilters
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
      />

      <UsersTable
        users={filteredUsers.map((u) => ({ 
          ...u, 
          name: <Username name={u.username} />,
          role: u.roles && u.roles.length > 0 ? u.roles[0].charAt(0).toUpperCase() + u.roles[0].slice(1) : "User",
          status: u.is_active ? "Active" : "Inactive",
          email: "-"  // API không có email field
        }))}
        onDelete={handleDelete}
      />

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddUserSubmit}
        loading={loading}
      />
    </div>
  );
}