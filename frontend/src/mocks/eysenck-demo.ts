export interface EysenckQuestion {
  id: number;
  text: string;
  scale?: 'extraversion' | 'neuroticism' | 'lie';
}

export const EYSENCK_QUESTIONS: EysenckQuestion[] = [
  { id: 1, text: "Часто ли вы испытываете тягу к новым впечатлениям, к тому, чтобы отвлечься, испытывать сильные ощущения?" },
  { id: 2, text: "Часто ли вы чувствуете, что нуждаетесь в друзьях, которые могут вас понять, ободрить или посочувствовать?" },
  { id: 3, text: "Считаете ли вы себя беззаботным человеком?" },
  { id: 4, text: "Очень ли трудно вам отказываться от своих намерений?" },
  { id: 5, text: "Обдумываете ли вы свои дела не спеша и предпочитаете ли подождать, прежде чем действовать?" },
  { id: 6, text: "Всегда ли вы сдерживаете свои обещания, даже если это вам невыгодно?" },
  { id: 7, text: "Часто ли у вас бывают спады и подъемы настроения?" },
  { id: 8, text: "Быстро ли вы обычно действуете и говорите, не тратите ли много времени на обдумывание?" },
  { id: 9, text: "Возникало ли у вас когда-нибудь чувство, что вы несчастны, хотя никакой серьезной причины для этого не было?" },
  { id: 10, text: "Верно ли, что на спор вы способны решиться на все?" },
  { id: 11, text: "Смущаетесь ли вы, когда хотите познакомиться с человеком противоположного пола, который вам симпатичен?" },
  { id: 12, text: "Бывает ли когда-нибудь, что, разозлившись, вы выходите из себя?" },
  { id: 13, text: "Часто ли бывает, что вы действуете необдуманно, под влиянием момента?" },
  { id: 14, text: "Часто ли вас беспокоят мысли о том, что вам не следовало чего-либо делать или говорить?" },
  { id: 15, text: "Предпочитаете ли вы чтение книг встречам с людьми?" },
  { id: 16, text: "Верно ли, что вас легко задеть?" },
  { id: 17, text: "Любите ли вы часто бывать в компании?" },
  { id: 18, text: "Бывают ли иногда у вас такие мысли, которыми вам не хотелось бы делиться с другими людьми?" },
  { id: 19, text: "Верно ли, что иногда вы настолько полны энергии, что все горит в руках, а иногда чувствуете сильную вялость?" },
  { id: 20, text: "Стараетесь ли вы ограничить круг своих знакомых небольшим числом самых близких друзей?" },
  { id: 21, text: "Много ли вы мечтаете?" },
  { id: 22, text: "Когда на вас кричат, отвечаете ли вы тем же?" },
  { id: 23, text: "Считаете ли вы все свои привычки хорошими?" },
  { id: 24, text: "Часто ли у вас появляется чувство, что вы в чем-то виноваты?" },
  { id: 25, text: "Способны ли вы иногда дать волю своим чувствам и беззаботно развлечься с веселой компанией?" },
  { id: 26, text: "Можно ли сказать, что нервы у вас часто бывают натянуты до предела?" },
  { id: 27, text: "Слывете ли вы за человека живого и веселого?" },
  { id: 28, text: "После того как дело сделано, часто ли вы мысленно возвращаетесь к нему и думаете, что могли бы сделать лучше?" },
  { id: 29, text: "Чувствуете ли вы себя неспокойно, находясь в большой компании?" },
  { id: 30, text: "Бывает ли, что вы передаете слухи?" },
  { id: 31, text: "Бывает ли, что вам не спится из-за того, что в голову лезут разные мысли?" },
  { id: 32, text: "Что вы предпочитаете, если хотите узнать что-либо: найти в книге или спросить у друзей?" },
  { id: 33, text: "Бывают ли у вас сильные сердцебиения?" },
  { id: 34, text: "Нравится ли вам работа, требующая сосредоточения?" },
  { id: 35, text: "Бывают ли у вас приступы дрожи?" },
  { id: 36, text: "Всегда ли вы говорите только правду?" },
  { id: 37, text: "Бывает ли вам неприятно находиться в компании, где все подшучивают друг над другом?" },
  { id: 38, text: "Раздражительны ли вы?" },
  { id: 39, text: "Нравится ли вам работа, требующая быстрого действия?" },
  { id: 40, text: "Верно ли, что вам часто не дают покоя мысли о разных неприятностях и «ужасах», которые могли бы произойти, хотя все кончилось благополучно?" },
  { id: 41, text: "Верно ли, что вы неторопливы в движениях и несколько медлительны?" },
  { id: 42, text: "Опаздывали ли вы когда-нибудь на работу или на встречу с кем-либо?" },
  { id: 43, text: "Часто ли вам снятся кошмары?" },
  { id: 44, text: "Верно ли, что вы так любите поговорить, что не упускаете любого удобного случая побеседовать с новым человеком?" },
  { id: 45, text: "Беспокоят ли вас какие-нибудь боли?" },
  { id: 46, text: "Огорчились бы вы, если бы долго не могли видеться со своими друзьями?" },
  { id: 47, text: "Можете ли вы назвать себя нервным человеком?" },
  { id: 48, text: "Есть ли среди ваших знакомых такие, которые вам явно не нравятся?" },
  { id: 49, text: "Могли бы вы сказать, что вы уверенный в себе человек?" },
  { id: 50, text: "Легко ли вас задевает критика ваших недостатков или вашей работы?" },
  { id: 51, text: "Трудно ли вам получить настоящее удовольствие от мероприятий, в которых участвует много народа?" },
  { id: 52, text: "Беспокоит ли вас чувство, что вы чем-то хуже других?" },
  { id: 53, text: "Сумели бы вы внести оживление в скучную компанию?" },
  { id: 54, text: "Бывает ли, что вы говорите о вещах, в которых совсем не разбираетесь?" },
  { id: 55, text: "Беспокоитесь ли вы о своем здоровье?" },
  { id: 56, text: "Любите ли вы подшутить над другими?" },
  { id: 57, text: "Страдаете ли вы бессонницей?" }
];

export const KEYS: {
  extraversion: { yes: number[]; no: number[] };
  neuroticism: { yes: number[]; no: number[] };
  lie: { yes: number[]; no: number[] };
} = {
  extraversion: {
    yes: [1, 3, 8, 10, 13, 17, 22, 25, 27, 39, 44, 46, 49, 53, 56],
    no: [5, 15, 20, 29, 32, 34, 37, 41, 51]
  },
  neuroticism: {
    yes: [2, 4, 7, 9, 11, 14, 16, 19, 21, 23, 26, 28, 31, 33, 35, 38, 40, 43, 45, 47, 50, 52, 55, 57],
    no: []
  },
  lie: {
    yes: [6, 24, 36],
    no: [12, 18, 30, 42, 48, 54]
  }
};


export interface StudentAnswerItem {
  questionId: number;
  questionText: string;
  scale: 'extraversion' | 'neuroticism' | 'lie';
  scaleName: string;
  value: 'Да' | 'Нет';
  isKeyMatch: boolean;
}

export function getQuestionScale(questionId: number): { scale: 'extraversion' | 'neuroticism' | 'lie'; scaleName: string } {
  if (KEYS.extraversion.yes.includes(questionId) || KEYS.extraversion.no.includes(questionId)) {
    return { scale: 'extraversion', scaleName: 'Экстраверсия' };
  }
  if (KEYS.neuroticism.yes.includes(questionId) || KEYS.neuroticism.no.includes(questionId)) {
    return { scale: 'neuroticism', scaleName: 'Нейротизм' };
  }
  return { scale: 'lie', scaleName: 'Шкала лжи' };
}

// Генерация случайных реалистичных ответов для тестов UI
export const MOCK_STUDENT_ANSWERS = EYSENCK_QUESTIONS.map(q => {
  const { scale, scaleName } = getQuestionScale(q.id);
  const value: 'Да' | 'Нет' = Math.random() > 0.4 ? "Да" : "Нет";
  const isKey =
    value === "Да"
      ? (KEYS.extraversion.yes.includes(q.id) || KEYS.neuroticism.yes.includes(q.id) || KEYS.lie.yes.includes(q.id))
      : (KEYS.extraversion.no.includes(q.id) || KEYS.neuroticism.no.includes(q.id) || KEYS.lie.no.includes(q.id));

  return {
    questionId: q.id,
    questionText: q.text,
    scale,
    scaleName,
    value,
    isKeyMatch: isKey,
  };
});

/**
 * Генерация стабильного набора ответов для конкретного ученика
 */
export function getMockStudentAnswers(studentSeed: string = 'default'): StudentAnswerItem[] {
  let hash = 0;
  for (let i = 0; i < studentSeed.length; i++) {
    hash = (hash << 5) - hash + studentSeed.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  return EYSENCK_QUESTIONS.map((q) => {
    const { scale, scaleName } = getQuestionScale(q.id);
    const isYes = (seed + q.id * 19) % 100 > 45;
    const value: 'Да' | 'Нет' = isYes ? "Да" : "Нет";
    const isKey =
      value === "Да"
        ? (KEYS.extraversion.yes.includes(q.id) || KEYS.neuroticism.yes.includes(q.id) || KEYS.lie.yes.includes(q.id))
        : (KEYS.extraversion.no.includes(q.id) || KEYS.neuroticism.no.includes(q.id) || KEYS.lie.no.includes(q.id));

    return {
      questionId: q.id,
      questionText: q.text,
      scale,
      scaleName,
      value,
      isKeyMatch: isKey,
    };
  });
}

export function calculateEysenckResults(answers: { questionId: number; value: string }[]) {
  let e = 0, n = 0, l = 0;

  answers.forEach(ans => {
    if (ans.value === "Да") {
      if (KEYS.extraversion.yes.includes(ans.questionId)) e++;
      if (KEYS.neuroticism.yes.includes(ans.questionId)) n++;
      if (KEYS.lie.yes.includes(ans.questionId)) l++;
    } else if (ans.value === "Нет") {
      if (KEYS.extraversion.no.includes(ans.questionId)) e++;
      if (KEYS.neuroticism.no.includes(ans.questionId)) n++;
      if (KEYS.lie.no.includes(ans.questionId)) l++;
    }
  });

  // Определение темперамента по осям (центр = 12)
  let temperament = "Смешанный";
  let temperamentColor = "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20";
  let description = "Сбалансированные черты характера с адаптивной эмоциональной регуляцией.";

  if (e > 12 && n > 12) {
    temperament = "Холерик (Нестабильный экстраверт)";
    temperamentColor = "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";
    description = "Высокая активность, импульсивность, страстность, эмоциональная возбудимость и быстрая смена настроения.";
  } else if (e > 12 && n <= 12) {
    temperament = "Сангвиник (Стабильный экстраверт)";
    temperamentColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    description = "Общительность, оптимизм, высокая работоспособность, эмоциональная устойчивость и лидерские качества.";
  } else if (e <= 12 && n > 12) {
    temperament = "Меланхолик (Нестабильный интроверт)";
    temperamentColor = "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
    description = "Высокая чувствительность, глубокие переживания, склонность к самоанализу, замкнутость и быстрая утомляемость.";
  } else if (e <= 12 && n <= 12) {
    temperament = "Флегматик (Стабильный интроверт)";
    temperamentColor = "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30";
    description = "Спокойствие, невозмутимость, методичность, высокий самоконтроль и устойчивость к стрессам.";
  }

  return {
    extraversion: e,
    neuroticism: n,
    lie: l,
    temperament,
    temperamentColor,
    description,
  };
}
