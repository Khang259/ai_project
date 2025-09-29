// src/pages/Users.jsx
import React from "react";
import UsersHeader from "@/components/Users/UsersHeader";
import UsersFilters from "@/components/Users/UsersFilters";
import UsersTable from "@/components/Users/UsersTable";
import { useUsers } from "@/hooks/Users/useUsers";
import Username from "@/components/Users/username";

export default function UserDashboard() {
  const {
    users,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    filteredUsers,
    handleDelete,
    loading,
    error,
  } = useUsers();

  if (loading) return <div className="p-6">Đang tải danh sách người dùng...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <UsersHeader onAdd={() => { /* Thêm logic gọi addUser nếu cần */ }} />

      <UsersFilters
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
      />

      <UsersTable
        users={filteredUsers.map((u) => ({ ...u, name: <Username name={u.name} /> }))}
        onDelete={handleDelete}
      />
    </div>
  );
}