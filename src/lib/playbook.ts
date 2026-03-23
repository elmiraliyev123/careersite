import type { Locale } from "@/lib/i18n";
import { createLocalizedText, getLocalizedText, type LocalizedContentValue } from "@/lib/localized-content";

type PlaybookCardLayout = "feature" | "wide" | "tall" | "standard";

type PlaybookArticle = {
  slug: string;
  tag: LocalizedContentValue;
  title: LocalizedContentValue;
  excerpt: LocalizedContentValue;
  readTime: number;
  layout: PlaybookCardLayout;
  visualLabel: string;
  gradient: string;
};

const playbookArticles: PlaybookArticle[] = [
  {
    slug: "interview-story",
    tag: createLocalizedText("Müsahibə", "Interview", "Интервью"),
    title: createLocalizedText(
      "Hər tapşırığı yox, bir güclü hekayəni danış",
      "Tell one sharp story instead of listing every task",
      "Расскажи одну сильную историю вместо перечисления всех задач"
    ),
    excerpt: createLocalizedText(
      "STAR cavabını şişirtmə. Bir problemi necə çərçivələdiyini, nəyi prioritetləşdirdiyini və nəticəni necə ölçdüyünü göstər.",
      "Do not overbuild the STAR answer. Show how you framed the problem, what you prioritized, and how you measured the result.",
      "Не перегружай STAR-ответ. Покажи, как ты сформулировал задачу, что расставил по приоритетам и как оценил результат."
    ),
    readTime: 3,
    layout: "feature",
    visualLabel: "STAR",
    gradient:
      "linear-gradient(135deg, rgba(214, 255, 95, 0.24) 0%, rgba(50, 205, 50, 0.12) 48%, rgba(9, 14, 9, 0.96) 100%)"
  },
  {
    slug: "cv-proof",
    tag: createLocalizedText("CV", "CV", "CV"),
    title: createLocalizedText(
      "CV-nin yuxarı hissəsində dərhal sübut göstər",
      "Show proof of work in the top third of your CV",
      "Покажи доказательства своей работы в верхней части CV"
    ),
    excerpt: createLocalizedText(
      "Kurs siyahısını aşağı sal. Yuxarıda layihə, nəticə və istifadə etdiyin alət görünməlidir ki, recruiter ilk 10 saniyədə güclü təəssürat alsın.",
      "Push the course list down. The top of the page should show a project, an outcome, and the tools you used so the recruiter gets a strong first impression in the first ten seconds.",
      "Опусти список курсов ниже. Вверху должны быть проект, результат и инструменты, чтобы рекрутер получил сильное первое впечатление в первые десять секунд."
    ),
    readTime: 4,
    layout: "tall",
    visualLabel: "CV",
    gradient:
      "linear-gradient(150deg, rgba(255, 255, 255, 0.14) 0%, rgba(214, 255, 95, 0.18) 40%, rgba(13, 18, 13, 0.98) 100%)"
  },
  {
    slug: "portfolio-shape",
    tag: createLocalizedText("Portfolio", "Portfolio", "Портфолио"),
    title: createLocalizedText(
      "Sadə portfolio çox vaxt artıq dizayn olunmuş portfoliodan güclüdür",
      "A simple portfolio usually beats an overdesigned one",
      "Простое портфолио чаще выигрывает у перегруженного дизайном"
    ),
    excerpt: createLocalizedText(
      "Bir ekran, bir problem, bir nəticə. Scroll zamanı hər case-in nə üçün vacib olduğunu dərhal anlamaq mümkün olmalıdır.",
      "One screen, one problem, one result. While scrolling, every case should explain why it matters almost immediately.",
      "Один экран, одна задача, один результат. При скролле должно быть сразу понятно, почему каждый кейс важен."
    ),
    readTime: 5,
    layout: "standard",
    visualLabel: "CASE",
    gradient:
      "linear-gradient(160deg, rgba(50, 205, 50, 0.14) 0%, rgba(118, 255, 207, 0.18) 44%, rgba(10, 13, 15, 0.96) 100%)"
  },
  {
    slug: "follow-up-template",
    tag: createLocalizedText("Outreach", "Outreach", "Аутрич"),
    title: createLocalizedText(
      "Follow-up mesajını ehtiyac yaranmamışdan əvvəl hazırla",
      "Write the follow-up message before you need it",
      "Подготовь follow-up сообщение до того, как оно понадобится"
    ),
    excerpt: createLocalizedText(
      "Müraciətdən sonra 48 saat içində göndərəcəyin qısa mesaj əvvəlcədən hazır olsa, tonun daha sakit, daha konkret və daha peşəkar qalır.",
      "If the short note you will send 48 hours after applying is already prepared, the tone stays calmer, more specific, and more professional.",
      "Если короткое сообщение, которое ты отправишь через 48 часов после отклика, готово заранее, тон остается спокойным, конкретным и профессиональным."
    ),
    readTime: 2,
    layout: "wide",
    visualLabel: "PING",
    gradient:
      "linear-gradient(135deg, rgba(112, 255, 177, 0.18) 0%, rgba(214, 255, 95, 0.1) 38%, rgba(13, 15, 16, 0.96) 100%)"
  },
  {
    slug: "ai-prompting",
    tag: createLocalizedText("AI", "AI", "AI"),
    title: createLocalizedText(
      "AI-dan struktur üçün istifadə et, təcrübə uydurmaq üçün yox",
      "Use AI to sharpen structure, not to invent experience",
      "Используй AI для структуры, а не для выдуманного опыта"
    ),
    excerpt: createLocalizedText(
      "Prompt işini sürətləndirə bilər, amma fərqləndirən hissə yenə də sənin konkret layihən, qərarın və nəticəndir.",
      "Prompting can speed up the draft, but the differentiator is still your concrete project, your decisions, and your outcomes.",
      "Промпты ускоряют черновик, но отличает тебя все равно конкретный проект, решения и результаты."
    ),
    readTime: 3,
    layout: "standard",
    visualLabel: "AI",
    gradient:
      "linear-gradient(140deg, rgba(96, 127, 255, 0.16) 0%, rgba(214, 255, 95, 0.14) 42%, rgba(12, 15, 17, 0.96) 100%)"
  },
  {
    slug: "offer-clarity",
    tag: createLocalizedText("Offer", "Offer", "Оффер"),
    title: createLocalizedText(
      "Offer mərhələsində cəsarətdən çox aydınlıq təsir edir",
      "At offer stage, clarity feels stronger than bravado",
      "На этапе оффера ясность работает сильнее, чем бравада"
    ),
    excerpt: createLocalizedText(
      "Tarix, maaş diapazonu, iş modeli və ilk gün gözləntisini bir mesajda dəqiqləşdir. Peşəkar təsir çox vaxt burada yaranır.",
      "Clarify the start date, salary range, work model, and first-week expectations in one message. This is often where maturity shows up.",
      "Уточни дату старта, диапазон зарплаты, формат работы и ожидания от первой недели в одном сообщении. Часто именно здесь видна зрелость."
    ),
    readTime: 4,
    layout: "wide",
    visualLabel: "OFFER",
    gradient:
      "linear-gradient(145deg, rgba(214, 255, 95, 0.18) 0%, rgba(255, 214, 94, 0.12) 42%, rgba(13, 13, 11, 0.97) 100%)"
  }
];

export function getLocalizedPlaybookArticles(locale: Locale) {
  return playbookArticles.map((article) => ({
    ...article,
    tag: getLocalizedText(article.tag, locale),
    title: getLocalizedText(article.title, locale),
    excerpt: getLocalizedText(article.excerpt, locale)
  }));
}
