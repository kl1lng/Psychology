import { StitchLoader } from '@/components/ui/stitch-loader';

export default function TeacherLoading() {
  return (
    <StitchLoader
      type="teacher"
      title="Кабинет преподавателя"
      subtitle="Загрузка результатов тестирования и списков классов..."
    />
  );
}
