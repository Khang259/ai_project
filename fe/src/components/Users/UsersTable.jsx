import React from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function UsersTable({ users, onDelete, onEdit, onCreateRoute }) {
  const {t} = useTranslation();

  const formatVNTime = (isoString) => {
    const date = new Date(isoString);
    date.setHours(date.getHours() + 7);
    return date.toLocaleString('vi-VN');
  };
  
  return (
    <div className="glass rounded-lg border border-gray-200 overflow-hidden shadow-md text-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-white">ID</TableHead>
            <TableHead className="text-white">{t('users.createdAt')}</TableHead>
            <TableHead className="text-white">{t('users.username')}</TableHead>
            <TableHead className="text-white">{t('users.status')}</TableHead>
            <TableHead className="text-white">{t('users.role')}</TableHead>
            <TableHead className="text-white">{t('users.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell>{formatVNTime(user.created_at)}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.is_active ? t('users.active') : t('users.inactive')}</TableCell>
              <TableCell>
                {user.roles.map(role => (
                  <Badge
                    key={role}
                    variant={role === "admin" ? "destructive" : 
                      role === "user" ? "ghost" :
                      role === "viewer" ? "primary" : "secondary"
                    }
                    className="mr-1"
                  >
                    {role}
                  </Badge>
                ))}
              </TableCell>
              <TableCell className="space-x-2">
                <Button variant="secondary" size="sm" onClick={() => onCreateRoute(user.id, user)}>
                  {t('users.createRoute')}
                </Button>
                <Button variant="default" size="sm" onClick={() => onEdit(user.id, user)}>
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