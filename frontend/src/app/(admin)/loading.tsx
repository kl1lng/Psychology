import { StitchLoader } from '@/components/ui/stitch-loader';

export default function AdminLoading() {
  return (
    <StitchLoader
      type="admin"
      title="Панель администратора"
      subtitle="Загрузка реестра пользователей, кафедр и аналитики..."
    />
  );
}
