import React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

export default function UsersHeader({ onAdd }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-4xl font-semibold text-white">{t('users.userManagement')}</h1>
      <Button
        className="glass w-30 h-10 text-white"
        onClick={onAdd}
      >
        <Plus className="w-4 h-4 mr-2" />
        {t('users.addUser')}
      </Button>
    </div>
  );
}


