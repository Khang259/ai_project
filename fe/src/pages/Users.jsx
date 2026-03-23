// src/pages/Users.jsx
import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import UsersHeader from "@/components/Users/UsersHeader";
import UsersFilters from "@/components/Users/UsersFilters";
import UsersTable from "@/components/Users/UsersTable";
import AddUserModal from "@/components/Users/AddUserModal";
import UpdateUserModal from "@/components/Users/UpdateUserModal";
import { useUsers } from "@/hooks/Users/useUsers";
import Username from "@/components/Users/username";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
// import { TrophySpin } from 'react-loading-indicators';

export default function UserDashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="scale-350 translate-y-80">
          {/* <TrophySpin 
            color="rgb(41, 125, 146)" 
            size="large-lg" 
            text={t('users.loading')} 
            textColor="rgb(41, 125, 146)" 
          /> */}
        </div>
      </div>
    );
  }

  const handleAddUserSubmit = async (userData) => {
    try {
      await handleAddUser(userData);
      toast.success(t('users.addUserSuccess'));
      setIsAddModalOpen(false);
    } catch (error) {
      window.alert(error);
      toast.error(t('users.addUserError'));
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
      window.alert(error);
      toast.error(error?.message || t('users.updateUserError'));
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 lg:space-y-8">
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
          roles: u.roles || [],
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