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
    <div className="flex gap-4 mt-4 flex-wrap items-center">
      <Input
        placeholder={t('users.searchByName')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-[200px] lg:w-[240px] rounded-lg text-white text-base lg:text-lg h-11 lg:h-12 min-h-[2.75rem] lg:min-h-[3rem]"
      />
      <Select value={roleFilter} onValueChange={onRoleChange} disabled={rolesLoading}>
        <SelectTrigger className="w-[160px] lg:w-[180px] text-base lg:text-lg h-11 lg:h-12">
          <SelectValue placeholder={rolesLoading ? t('users.loadingRoles') : t('users.filterByRole')} />
        </SelectTrigger>
        <SelectContent className="text-base lg:text-lg">
          <SelectItem value="all" className="text-base lg:text-lg">{t('users.allRoles')}</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.name} className="text-base lg:text-lg">
              {t(`users.${role.name}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}