import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getRoles } from "@/services/roles";
import { useTranslation } from "react-i18next";
export default function UsersFilters({ search, onSearchChange, roleFilter, onRoleChange }) {
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Load roles khi component mount
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setRolesLoading(true);
        const rolesData = await getRoles();
        setRoles(rolesData || []);
      } catch (error) {
        console.error("Error loading roles:", error);
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, []);

  return (
    <div className="flex gap-4 mt-4">
      <Input
        placeholder={t('users.searchByName')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-[200px] rounded-lg text-white"
      />
      <Select value={roleFilter} onValueChange={onRoleChange} disabled={rolesLoading}>
        <SelectTrigger className="w-[140px]" >
          <SelectValue placeholder={rolesLoading ? t('users.loadingRoles') : t('users.filterByRole')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('users.allRoles')}</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.name}>
              {t(`users.${role.name}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}