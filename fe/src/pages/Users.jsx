// src/pages/Users.jsx
import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import UsersHeader from "@/components/Users/UsersHeader";
import UsersFilters from "@/components/Users/UsersFilters";
import UsersTable from "@/components/Users/UsersTable";
import AddUserModal from "@/components/Users/AddUserModal";
import UpdateUserModal from "@/components/Users/UpdateUserModal";
import CreateRouteModal from "@/components/Users/CreateRouteModal";
import { useUsers } from "@/hooks/Users/useUsers";
import Username from "@/components/Users/username";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";

export default function UserDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCreateRouteModalOpen, setIsCreateRouteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { t } = useTranslation();
  const { auth } = useAuth();
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

  // Lọc users dựa trên role của current user
  const displayUsers = React.useMemo(() => {
    const currentUserRoles = auth?.user?.roles || [];
    const isOperator = currentUserRoles.includes('operator');
    
    // Nếu là operator (và không phải admin), chỉ hiển thị users có role "user"
    if (isOperator ) {
      return filteredUsers.filter(user => 
        user.roles && user.roles.includes('user')
      );
    }
    
    // Admin hoặc role khác thì hiển thị tất cả
    return filteredUsers;
  }, [filteredUsers, auth?.user?.roles]);

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

  const handleCreateRoute = (id, user) => {
    setSelectedUser(user);
    setIsCreateRouteModalOpen(true);
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
        users={displayUsers.map((u) => ({ 
          ...u, 
          name: <Username name={u.username} />,
          // Giữ nguyên roles array để UsersTable có thể hiển thị đúng
          roles: u.roles || [],
          status: u.is_active ? "Active" : "Inactive",
        }))}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onCreateRoute={handleCreateRoute}
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
      
      <CreateRouteModal
        isOpen={isCreateRouteModalOpen}
        onClose={() => setIsCreateRouteModalOpen(false)}
        onSubmit={handleCreateRoute}
        loading={loading}
        user={selectedUser}
      />
    </div>
  );
}