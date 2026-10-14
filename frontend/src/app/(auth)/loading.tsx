import { StitchLoader } from '@/components/ui/stitch-loader';

export default function AuthLoading() {
  return (
    <StitchLoader
      type="general"
      title="Авторизация"
      subtitle="Проверка параметров сессии и безопасности..."
    />
  );
}
