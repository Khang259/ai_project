import React from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function UsersTable({ users, onDelete, onEdit }) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden border border-gray-200 shadow-md">
      <Table>
        <TableCaption>Danh sách người dùng trong hệ thống</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Thời gian tạo</TableHead>
            <TableHead>Tên người dùng</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Quyền</TableHead>
            <TableHead>Tùy chỉnh</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.created_at}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.is_active ? "Active" : "Inactive"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.roles.join(", ")}</Badge>
              </TableCell>
              <TableCell className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(user.id, user)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(user.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


