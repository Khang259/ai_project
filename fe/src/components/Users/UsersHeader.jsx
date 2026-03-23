import React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

export default function UsersHeader({ onAdd }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-3xl lg:text-4xl font-semibold text-white">{t('users.userManagement')}</h1>
      <Button
        className="glass min-w-[10rem] lg:min-w-[11rem] h-11 lg:h-12 text-base lg:text-lg text-white px-4 lg:px-5"
        onClick={onAdd}
      >
        <Plus className="w-5 h-5 lg:w-5 lg:h-5 mr-2" />
        {t('users.addUser')}
      </Button>
    </div>
  );
}


