import { StitchLoader } from '@/components/ui/stitch-loader';

export default function StudentLoading() {
  return (
    <StitchLoader
      type="student"
      title="Платформа AISezim"
      subtitle="Загрузка психологических тестов, чатов и практик..."
    />
  );
}
