// src/pages/Users.jsx
import React, { useState } from "react";
import { toast } from "sonner";
import UsersHeader from "@/components/Users/UsersHeader";
import UsersFilters from "@/components/Users/UsersFilters";
import UsersTable from "@/components/Users/UsersTable";
import AddUserModal from "@/components/Users/AddUserModal";
import UpdateUserModal from "@/components/Users/UpdateUserModal";
import { useUsers } from "@/hooks/Users/useUsers";
import Username from "@/components/Users/username";
import { useArea } from "@/contexts/AreaContext";
import { useTranslation } from 'react-i18next';

export default function UserDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { currAreaName, currAreaId } = useArea();
  const { t } = useTranslation();  
  const {
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
  } = useUsers();

  if (loading) return <div className="p-6">{t('users.loading')}</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const handleAddUserSubmit = async (userData) => {
    try {
      await handleAddUser(userData);
      toast.success(t('users.addUserSuccess'));
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Lỗi khi thêm user:", error);
      toast.error(error?.message || t('users.addUserError'));
    }
  };

  const handleEdit = (id, user) => {
    setSelectedUser(user);
    setIsUpdateModalOpen(true);
  };

  const handleUpdateUserSubmit = async (payload) => {
    if (!selectedUser?.id) return;
    try {
      await handleUpdateUser(selectedUser.id, payload);
      toast.success(t('users.updateUserSuccess'));
      setIsUpdateModalOpen(false);
    } catch (error) {
      toast.error(error?.message || t('users.updateUserError'));
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
          role: u.roles && u.roles.length > 0 ? u.roles[0].charAt(0).toUpperCase() + u.roles[0].slice(1) : t('users.user'),
          status: u.is_active ? "Active" : "Inactive",
        }))}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddUserSubmit}
        loading={loading}
      />

      <UpdateUserModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onSubmit={handleUpdateUserSubmit}
        loading={loading}
        userData={selectedUser}
      />
      
    </div>
  );
}