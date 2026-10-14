import { StitchLoader } from '@/components/ui/stitch-loader';

export default function PsychologistLoading() {
  return (
    <StitchLoader
      type="psychologist"
      title="Кабинет психолога"
      subtitle="Загрузка аналитики рисков, архива консультаций и тестов..."
    />
  );
}
