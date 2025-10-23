import React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function UsersHeader({ onAdd }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-4xl font-semibold text-gray-900">{t('users.userManagement')}</h1>
      <Button onClick={onAdd}>{t('users.addUser')}</Button>
    </div>
  );
}


