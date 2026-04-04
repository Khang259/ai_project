import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function UsersTable({ users, onDelete, onEdit }) {
  const {t} = useTranslation();

  const formatVNTime = (isoString) => {
    const date = new Date(isoString);
    date.setHours(date.getHours() + 7);
    return date.toLocaleString('vi-VN');
  };
  
  const thClass = "text-white py-3 px-3 lg:py-4 lg:px-4 text-base lg:text-lg font-semibold";
  const tdClass = "text-white py-3 px-3 lg:py-4 lg:px-4 text-base lg:text-lg";

  return (
    <div className="glass rounded-lg border border-gray-200 overflow-hidden shadow-md text-white">
      <Table className="text-base lg:text-lg">
        <TableHeader>
          <TableRow>
            <TableHead className={thClass}>ID</TableHead>
            <TableHead className={thClass}>{t('users.createdAt')}</TableHead>
            <TableHead className={thClass}>{t('users.username')}</TableHead>
            <TableHead className={thClass}>{t('users.status')}</TableHead>
            <TableHead className={thClass}>{t('users.role')}</TableHead>
            <TableHead className={thClass}>{t('users.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className={tdClass}>{user.id}</TableCell>
              <TableCell className={tdClass}>{formatVNTime(user.created_at)}</TableCell>
              <TableCell className={tdClass}>{user.name}</TableCell>
              <TableCell className={tdClass}>{user.is_active ? t('users.active') : t('users.inactive')}</TableCell>
              <TableCell className={tdClass}>
                {user.roles.map(role => (
                  <Badge
                    key={role}
                    variant={role === "admin" ? "destructive" : 
                      role === "user" ? "ghost" :
                      role === "viewer" ? "primary" : "secondary"
                    }
                    className="mr-1 text-sm lg:text-base px-2.5 py-0.5"
                  >
                    {role}
                  </Badge>
                ))}
              </TableCell>
              <TableCell className={`space-x-2 ${tdClass}`}>
                <Button variant="default" size="sm" className="text-sm lg:text-base h-9 lg:h-10 px-3" onClick={() => onEdit(user.id, user)}>
                  {t('users.edit')}
                </Button>
                <Button variant="destructive" size="sm" className="text-sm lg:text-base h-9 lg:h-10 px-3" onClick={() => onDelete(user.id)}>
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