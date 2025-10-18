import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getRoles } from "@/services/roles";

export default function UsersFilters({ search, onSearchChange, roleFilter, onRoleChange }) {
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
    <div className="flex gap-4">
      <Input
        placeholder="Search by name..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs"
      />
      <Select value={roleFilter} onValueChange={onRoleChange} disabled={rolesLoading}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Filter by role"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.name}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}