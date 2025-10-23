import React from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function UsersTable({ users, onDelete, onEdit }) {
  const {t} = useTranslation();
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden border border-gray-200 shadow-md">
      <Table>
        <TableCaption>{t('users.userList')}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>{t('users.createdAt')}</TableHead>
            <TableHead>{t('users.username')}</TableHead>
            <TableHead>{t('users.status')}</TableHead>
            <TableHead>{t('users.role')}</TableHead>
            <TableHead>{t('users.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.created_at}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.is_active ? t('users.active') : t('users.inactive')}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.roles.join(", ")}</Badge>
              </TableCell>
              <TableCell className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(user.id, user)}>
                  {t('users.edit')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(user.id)}>
                  {t('users.delete')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


