import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function UsersFilters({ search, onSearchChange, roleFilter, onRoleChange }) {
  return (
    <div className="flex gap-4">
      <Input
        placeholder="Search by name..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs"
      />
      <Select value={roleFilter} onValueChange={onRoleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All</SelectItem>
          <SelectItem value="Admin">Admin</SelectItem>
          <SelectItem value="Manager">Manager</SelectItem>
          <SelectItem value="User">User</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}


