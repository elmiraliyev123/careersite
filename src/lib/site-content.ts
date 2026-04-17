export type InfoPage = {
  sectionSlug: string;
  sectionLabel: string;
  slug: string;
  label: string;
  title: string;
  description: string;
  intro: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
};

type InfoSection = {
  slug: string;
  label: string;
  pages: Omit<InfoPage, "sectionSlug" | "sectionLabel">[];
};

const infoSections: InfoSection[] = [
  {
    slug: "students",
    label: "Tələbələr",
    pages: [
      {
        slug: "tecrube-proqramlari",
        label: "Təcrübə proqramları",
        title: "Təcrübə proqramlarını daha ağıllı müqayisə et",
        description: "İnternship və trainee elanlarını ilk karyera addımına uyğun şəkildə müqayisə etmək üçün qısa bələdçi.",
        intro:
          "CareerApple tələbələrə sadəcə elan siyahısı vermir. Rol səviyyəsi, iş modeli, son müraciət tarixi və şirkət etibarı bir yerdə göründüyü üçün seçim daha tez və daha inamlı olur.",
        highlights: [
          "Təcrübə, trainee və yeni məzun rolları daha aydın müqayisə olunur.",
          "Yeni elanlar və yaxın tarixli müraciətlər daha tez seçilir.",
          "Verified badge etibarlı və aydın təqdim olunan şirkətləri fərqləndirməyə kömək edir."
        ],
        ctaLabel: "Vakansiyalara bax",
        ctaHref: "/jobs"
      },
      {
        slug: "kim-ishe-goturur",
        label: "Kim işə qəbul edir",
        title: "Hazırda gəncləri kim işə qəbul edir",
        description: "Platformada hansı sektorların aktiv olduğunu və hansı rolların daha çox açıldığını izah edən qısa xəritə.",
        intro:
          "Azərbaycan bazarında gənclər üçün ən aktiv komandalar adətən data, marketinq, müştəri təcrübəsi, satış dəstəyi və məhsul əməliyyatları istiqamətlərində görünür. CareerApple bu mənzərəni bir yerdə görməyi asanlaşdırır.",
        highlights: [
          "Bank, fintex, FMCG və SaaS komandaları daha çox entry-level rol açır.",
          "Fərqli platformalarda yayımlanan elanları bir yerdə görmək daha asandır.",
          "Şirkət profili olan işəgötürənləri müqayisə etmək daha rahatdır."
        ],
        ctaLabel: "Yeni elanlara keç",
        ctaHref: "/jobs"
      },
      {
        slug: "karyera-meslehetleri",
        label: "Karyera məsləhətləri",
        title: "İlk müraciət üçün praktik karyera məsləhətləri",
        description: "CV, portfoliо, cover note və müsahibə mərhələsi üçün gənclərə fokuslanan əsas istiqamətlər.",
        intro:
          "Gənc namizədlər üçün əsas fərq illərin sayı deyil, özünü necə təqdim etdiyindir. Portfolio, mini layihələr, analitik düşüncə və yazılı təqdimat çox vaxt təcrübədən daha çox təsir edir.",
        highlights: [
          "CV-də kurs siyahısından çox nəticə göstərən layihələr önə çıxarılmalıdır.",
          "Junior rollar üçün problem həlli və kommunikasiya nümunələri əlavə üstünlük yaradır.",
          "Müraciət etdiyin hər rol üçün açar sözlərə uyğun qısa cover note hazırlamaq lazımdır."
        ],
        ctaLabel: "Uyğun rolları filtrlə",
        ctaHref: "/jobs"
      },
      {
        slug: "careerapple-ai",
        label: "CareerApple AI",
        title: "CareerApple AI sənə seçim anında necə kömək edəcək",
        description: "Gələcəkdə əlavə olunacaq ağıllı uyğunluq və CV dəstəyi barədə qısa baxış.",
        intro:
          "CareerApple AI gələcək mərhələdə istifadəçiyə daha sürətli qərar vermək üçün düşünülür. Məqsəd uyğun rolları daha aydın göstərmək, CV-ni gücləndirmək və növbəti addımı seçməyi asanlaşdırmaqdır.",
        highlights: [
          "Rol uyğunluğu üçün bacarıq əsaslı tövsiyələr veriləcək.",
          "CV-də boş qalan hissələr üçün redaktə təklifləri hazırlanacaq.",
          "Müraciətdə səni önə çıxaran güclü tərəflər daha aydın vurğulanacaq."
        ],
        ctaLabel: "Ana səhifəyə bax",
        ctaHref: "/"
      },
      {
        slug: "fellowship-proqrami",
        label: "Fellowship proqramı",
        title: "Fellowship proqramı ilə mentorlu keçid modeli",
        description: "Gəncləri ilk roluna hazırlamaq üçün planlaşdırılan cohort və mentorluq proqramı.",
        intro:
          "Fellowship proqramı CareerApple-ın gələcək community qatıdır. Məqsəd yalnız vakansiya göstərmək deyil, seçilmiş namizədləri mentor, workshop və mini layihələrlə daha hazır vəziyyətə gətirməkdir.",
        highlights: [
          "Seçilmiş cohort-lar üzrə mentor sessiyaları planlanır.",
          "Partnyor şirkətlər üçün hazır namizəd hovuzu formalaşdırılır.",
          "Tələbə klubları və karyera mərkəzləri ilə ortaq proqramlar nəzərdə tutulur."
        ],
        ctaLabel: "İşəgötürən səhifəsini oxu",
        ctaHref: "/for-employers"
      },
      {
        slug: "imkanlar",
        label: "İmkanlar",
        title: "İmkanlar bölməsində yalnız uyğun elanlar qalmalıdır",
        description: "CareerApple-ın niyə yalnız internship, junior və yeni məzun rollarına fokuslandığını izah edən qısa qeyd.",
        intro:
          "Gənclər üçün platformalarda əsas problem səs-küydür. Senior və əlaqəsiz elanlar ilk iş axtaran istifadəçini yorur. Buna görə CareerApple erkən karyera rollarını daha təmiz və fokuslu şəkildə göstərir.",
        highlights: [
          "Filtrlər gənclərə uyğun səviyyələri daha tez önə çıxarır.",
          "Uyğun olmayan rollar əsas lentdə diqqəti dağıtmır.",
          "Seçilmiş bannerlər daha relevant və etibarlı imkanları göstərir."
        ],
        ctaLabel: "Featured elanlara bax",
        ctaHref: "/"
      }
    ]
  },
  {
    slug: "employers",
    label: "İşəgötürənlər",
    pages: [
      {
        slug: "qiymetlendirme",
        label: "Qiymətləndirmə",
        title: "İşəgötürən üçün dəyər və nəticə çərçivəsi",
        description: "CareerApple-ın işəgötürənə hansı üstünlükləri verdiyini göstərən qısa çərçivə.",
        intro:
          "Bu məhsul klassik job board kimi deyil. Məqsəd gənc auditoriya qarşısında daha güclü görünmək, daha uyğun namizədlər toplamaq və açıq rolları daha aydın təqdim etməkdir.",
        highlights: [
          "Seçilmiş yerləşdirmə erkən karyera rolları üçün daha güclü görünürlük yaradır.",
          "Aydın şəhər, son tarix və müraciət keçidi namizəd qərarını sürətləndirir.",
          "Etibarlı və səliqəli profil daha keyfiyyətli ilk təəssürat yaradır."
        ],
        ctaLabel: "İşəgötürən səhifəsinə keç",
        ctaHref: "/for-employers"
      },
      {
        slug: "demo-isteyi",
        label: "Demo istəyi",
        title: "CareerApple demo istəyi və əməkdaşlıq çərçivəsi",
        description: "İşəgötürən komandalarının platformaya qoşulması üçün sadə və aydın başlanğıc.",
        intro:
          "CareerApple şirkətlərə gənc auditoriya qarşısında daha premium görünmək üçün qurulub. Demo mərhələsi komandanın ehtiyacını anlamaq, şirkət təqdimatını gücləndirmək və doğru rolları daha yaxşı nümayiş etdirmək üçündür.",
        highlights: [
          "Şirkət təqdimatı daha aydın və etibarlı görünəcək şəkildə hazırlanır.",
          "Vakansiyalar gənc auditoriya üçün daha rahat kəşf olunan formaya salınır.",
          "Demo mərhələsində əsas diqqət internship və yeni məzun rollarına verilir."
        ],
        ctaLabel: "Əlaqə məlumatlarına bax",
        ctaHref: "/info/support/elaqe"
      },
      {
        slug: "karyera-merkezleri",
        label: "Karyera mərkəzləri",
        title: "Universitet karyera mərkəzləri ilə əməkdaşlıq modeli",
        description: "Universitetlər və youth communities ilə işləmək üçün hazırlanmış ilkin istiqamətlər.",
        intro:
          "CareerApple təkcə işəgötürənlə namizədi deyil, universitet karyera mərkəzlərini də bu təcrübəyə qoşmağı planlayır. Məqsəd tələbələrə daha tez və daha etibarlı imkanlar çatdırmaqdır.",
        highlights: [
          "Karyera mərkəzləri üçün paylaşım dəstləri və seçilmiş vakansiya feed-ləri nəzərdə tutulur.",
          "Fellowship və tədbir proqramları universitet tərəfi ilə birgə qurula bilər.",
          "İşəgötürən kampaniyaları üçün auditoriya seqmentləri hazırlanır."
        ],
        ctaLabel: "Fellowship proqramını oxu",
        ctaHref: "/info/students/fellowship-proqrami"
      },
      {
        slug: "marketinq-aletleri",
        label: "Marketinq alətləri",
        title: "Gənc auditoriya üçün marketinq alətləri və paylaşım materialları",
        description: "İşəgötürənlərin internship elanlarını daha yaxşı təqdim etməsi üçün istifadə ediləcək material seti.",
        intro:
          "Gənc istifadəçi üçün iş elanı sadəcə mətn deyil. Güclü başlıq, aydın xülasə, düzgün iş modeli və son tarix namizədin qərarını birbaşa gücləndirir.",
        highlights: [
          "Banner, qısa copy və etibar hissi birlikdə işləyir.",
          "Şirkət təqdimatı daha aydın və premium görünməlidir.",
          "Müraciət keçidi birbaşa və rahat olmalıdır."
        ],
        ctaLabel: "İşəgötürən səhifəsinə keç",
        ctaHref: "/for-employers"
      },
      {
        slug: "tehlukesizlik",
        label: "Təhlükəsizlik",
        title: "Şirkət profili və elanlarda etibar qaydaları",
        description: "Etibarlı profillər və rahat müraciət təcrübəsi üçün əsas prinsiplər.",
        intro:
          "CareerApple-da məqsəd namizədə daha etibarlı təcrübə verməkdir. Şirkət məlumatlarının aydınlığı, düzgün keçidlər və premium təqdimat bu etibarı gücləndirir.",
        highlights: [
          "Etibarlı şirkət təqdimatı namizəddə daha güclü ilk təəssürat yaradır.",
          "Müraciət linklərinin birbaşa və düzgün olması istifadəçi yolunu rahat saxlayır.",
          "Şirkət və vakansiya məlumatları aydın görünəcək şəkildə qorunur."
        ],
        ctaLabel: "Hüquq mərkəzinə bax",
        ctaHref: "/info/support/huquq-merkezi"
      }
    ]
  },
  {
    slug: "legal",
    label: "Hüquq",
    pages: [
      {
        slug: "istifade-sertleri",
        label: "İstifadə şərtləri",
        title: "Platformadan istifadə üçün əsas şərtlər",
        description: "CareerApple təcrübəsini aydın və etibarlı saxlayan əsas qaydalar.",
        intro:
          "CareerApple istifadəçi və şirkət təcrübəsini aydın qaydalarla qoruyur. Bu bölmə platformada görünən məlumatlardan və təqdim olunan imkanlardan necə istifadə olunduğunu izah edir.",
        highlights: [
          "İstifadəçi açıq elanları və karyera resurslarını rahat şəkildə görə bilir.",
          "Şirkət təqdimatları etibarlı və aydın görünəcək şəkildə qorunur.",
          "Platformadakı məlumatlar istifadəçi təcrübəsini yaxşı saxlamaq üçün yenilənə bilər."
        ],
        ctaLabel: "Məxfilik siyasətinə bax",
        ctaHref: "/info/legal/maxfilik-siyaseti"
      },
      {
        slug: "maxfilik-siyaseti",
        label: "Məxfilik",
        title: "CareerApple məxfilik siyasəti",
        description: "Məlumatın qorunması və istifadəçi rahatlığı barədə qısa qeyd.",
        intro:
          "CareerApple istifadəçi etibarını qorumağı vacib sayır. Məlumatın necə saxlanması və istifadəçi rahatlığının necə qorunması bu bölmədə sadə dillə izah olunur.",
        highlights: [
          "İstifadəçi məlumatları diqqətlə və ehtiyatla işlənir.",
          "Vacib seçimlər daha aydın və rahat görünəcək şəkildə saxlanılır.",
          "Məxfilik təcrübəsi istifadəçi etibarını qorumaq üçün davamlı olaraq yaxşılaşdırılır."
        ],
        ctaLabel: "Privacy seçimlərinə bax",
        ctaHref: "/info/support/maxfilik-secimlerin"
      },
      {
        slug: "menbe-siyaseti",
        label: "Etibar və elan siyasəti",
        title: "Elanlar üçün etibar və şəffaflıq siyasəti",
        description: "CareerApple-da görünən elanların aydın və rahat təcrübə yaratması üçün əsas yanaşma.",
        intro:
          "CareerApple-da elanlar istifadəçiyə aydın, etibarlı və rahat görünməlidir. Məqsəd namizədi uyğun rola daha tez çatdırmaq və seçim anını sadələşdirməkdir.",
        highlights: [
          "Müraciət keçidi aydın və birbaşa saxlanılır.",
          "Erkən karyera auditoriyasına uyğun elanlar önə çıxarılır.",
          "Şirkət təqdimatı və elan dili etibar hissini qoruyur."
        ],
        ctaLabel: "Etibar qaydalarına bax",
        ctaHref: "/info/employers/tehlukesizlik"
      },
      {
        slug: "kukiler",
        label: "Cookie seçimləri",
        title: "Cookie seçimləri və rahatlıq",
        description: "Platformanın daha rahat işləməsi üçün əsas seçimlər barədə qısa izah.",
        intro:
          "CareerApple-da cookie istifadəsi istifadəçi təcrübəsini rahat saxlamaq üçündür. Məqsəd sürətli baxış, yadda saxlanan seçimlər və daha sabit təcrübə təqdim etməkdir.",
        highlights: [
          "Vacib seçimlər istifadəçi rahatlığı üçün saxlanıla bilər.",
          "Məxfilik balansı və rahatlıq birlikdə qorunur.",
          "Gələcək yeniliklərdə seçimlər daha aydın görünəcək."
        ],
        ctaLabel: "Dəstək bölməsinə keç",
        ctaHref: "/info/support/yardim-merkezi"
      }
    ]
  },
  {
    slug: "company",
    label: "Şirkət",
    pages: [
      {
        slug: "haqqimizda",
        label: "Haqqımızda",
        title: "CareerApple nə üçün yaradılıb",
        description: "Gənclər üçün internship və ilk iş axtarışını daha təmiz və relevant etmək məqsədi ilə qurulan məhsulun qısa hekayəsi.",
        intro:
          "CareerApple-ın əsas ideyası sadədir: ilk iş axtaran istifadəçiyə ən vacib olanı daha tez göstərmək. Platforma buna görə təmiz görünüş, qısa copy və yüksək uyğunluq hissi üzərində qurulub.",
        highlights: [
          "Məhsul Azərbaycan bazarı və gənc auditoriya üçün lokallaşdırılır.",
          "İlk mərhələdə diqqət internship, trainee və junior rollarındadır.",
          "Əsas fokus uyğun vakansiyanı daha tez tapdırmaqdır."
        ],
        ctaLabel: "Ana səhifəyə qayıt",
        ctaHref: "/"
      },
      {
        slug: "komandaya-qosul",
        label: "Komandaya qoşul",
        title: "CareerApple komandasına necə qoşula bilərsən",
        description: "Məhsul, growth və community istiqamətində gələcək komanda genişlənməsi üçün qısa baxış.",
        intro:
          "CareerApple böyüdükcə məhsul, growth və community istiqamətlərində güclü insanlara ehtiyac artacaq. Məqsəd gənclər üçün daha güclü karyera təcrübəsi qurmaqdır.",
        highlights: [
          "Məhsul düşüncəsi, growth və dizayn keyfiyyəti əsas prioritetlərdəndir.",
          "University community və employer relations ayrıca istiqamət kimi formalaşacaq.",
          "Məhsul dili və UX qərarları Azərbaycan bazarına uyğun saxlanılır."
        ],
        ctaLabel: "Karyera məsləhətlərini oxu",
        ctaHref: "/karyera-meslehetleri"
      },
      {
        slug: "media",
        label: "Media",
        title: "Media və press üçün qısa məhsul məlumatı",
        description: "CareerApple-ı təqdim etmək üçün istifadə oluna biləcək sadə məhsul mövqeləndirməsi.",
        intro:
          "CareerApple gənclər üçün internship və ilk iş elanlarını təsdiqlənmiş işəgötürən profilləri ilə bir araya gətirən yerli karyera platformasıdır.",
        highlights: [
          "Məhsul copy-si qısa, local və action-first yanaşma ilə yazılır.",
          "İstifadəçiyə görünən səhifələrdə sadə və premium dil qorunur.",
          "Məhsul dizaynında soft-blue-on-black identikası qorunur."
        ],
        ctaLabel: "Brend qaydalarına bax",
        ctaHref: "/info/company/brend-qaydalari"
      },
      {
        slug: "blog",
        label: "Blog",
        title: "Blog üçün mövzu xəritəsi",
        description: "CareerApple blogunda hansı mövzuların prioritet olacağına dair qısa redaksiya istiqaməti.",
        intro:
          "Blog CareerApple-ın etibarını və faydasını gücləndirən kontent qatıdır. İlk mərhələdə internship bazarı, CV məsləhətləri, junior müsahibə hazırlığı və işəgötürən dünyası əsas mövzulardır.",
        highlights: [
          "Azerbaijani və English terminlərin aydın lokallaşdırılması vacibdir.",
          "Hər yazı məhsuldakı konkret user action ilə bağlanmalıdır.",
          "Blog kontenti vakansiya feed-indən ayrı, amma məhsulu gücləndirən qat kimi işləməlidir."
        ],
        ctaLabel: "Karyera məsləhətlərinə keç",
        ctaHref: "/karyera-meslehetleri"
      },
      {
        slug: "brend-qaydalari",
        label: "Brend qaydaları",
        title: "CareerApple brend qaydaları",
        description: "Vizual dil, ton və etibar hissi üçün istifadə olunan əsas qaydalar.",
        intro:
          "CareerApple vizual dili tünd fon, soft blue vurğular və aydın spacing üzərində qurulub. Məhsul dili də eyni dərəcədə sadə, sürətli və gənc auditoriya üçün anlaşılır saxlanılır.",
        highlights: [
          "San Francisco əsas tipografiya kimi istifadə olunur.",
          "Soft blue accent yalnız vacib action və etibar hissi yaradan nöqtələrdə işlədilir.",
          "Kartlar və bannerlər sadə, sərt və yüksək kontrastlı saxlanılır."
        ],
        ctaLabel: "Ana səhifəni aç",
        ctaHref: "/"
      }
    ]
  },
  {
    slug: "support",
    label: "Dəstək",
    pages: [
      {
        slug: "yardim-merkezi",
        label: "Yardım mərkəzi",
        title: "Platformadan istifadə üçün yardım mərkəzi",
        description: "Vakansiya axtarışı, yadda saxlama və müraciət addımları ilə bağlı əsas sualların cavabları.",
        intro:
          "CareerApple-da əsas məqsəd uyğun vakansiyanı tez tapmaq, yadda saxlamaq və rahat müraciət etməkdir. Yardım mərkəzi bu təcrübəni daha aydın göstərmək üçündür.",
        highlights: [
          "Axtarış və filtrlər bütün istifadəçilər üçün rahatdır.",
          "Namizəd login və signup hələ aktiv deyil.",
          "Əsas təcrübə vakansiya kəşfi və müraciət rahatlığı üzərində qurulub."
        ],
        ctaLabel: "Vakansiyalara bax",
        ctaHref: "/jobs"
      },
      {
        slug: "elaqe",
        label: "Əlaqə",
        title: "CareerApple ilə əlaqə üçün əsas kanallar",
        description: "Demo, partnership və məhsul əməkdaşlığı üçün əlaqə çərçivəsi.",
        intro:
          "CareerApple ilə əməkdaşlıq, demo və media sorğuları üçün əlaqə qurmaq istəyirsənsə, ən rahat yol birbaşa e-poçtdur. Bütün əsas sorğular üçün vahid ünvan istifadə olunur: contact@trystradify.app.",
        highlights: [
          "Demo və işəgötürən əməkdaşlığı sorğuları prioritetlə cavablandırılır.",
          "University partnership və fellowship maraqları ayrıca qeyd oluna bilər.",
          "Əlaqə ünvanı: contact@trystradify.app"
        ],
        ctaLabel: "İşəgötürən səhifəsinə bax",
        ctaHref: "/for-employers"
      },
      {
        slug: "huquq-merkezi",
        label: "Hüquq mərkəzi",
        title: "Hüquq mərkəzi və etibar qeydləri",
        description: "Etibar, məxfilik və istifadə şərtləri arasında keçid nöqtəsi.",
        intro:
          "CareerApple-da hüquqi təməl yalnız sənəd olmaq üçün deyil. Məqsəd istifadəçi və şirkət tərəfi üçün etibarlı, aydın və şəffaf təcrübə yaratmaqdır.",
        highlights: [
          "Şirkət təqdimatı və vakansiya məlumatı aydın saxlanmalıdır.",
          "Məxfilik və istifadə qaydaları bir-birini tamamlamalıdır.",
          "Etibar hissi platformanın əsas prinsiplərindən biridir."
        ],
        ctaLabel: "Hüquq səhifələrini aç",
        ctaHref: "/info/legal/istifade-sertleri"
      },
      {
        slug: "maxfilik-secimlerin",
        label: "Məxfilik seçimlərin",
        title: "Məxfilik seçimlərini necə idarə etməliyik",
        description: "İstifadəçi seçimi və rahatlıq balansı barədə qısa qeyd.",
        intro:
          "Məxfilik seçimləri istifadəçiyə nəzarət hissi verməlidir. Məqsəd seçimləri aydın saxlamaq və platforma təcrübəsini rahat qorumaqdır.",
        highlights: [
          "Hazırkı mərhələdə seçimlər sadə və başadüşüləndir.",
          "Gələcəkdə əlavə seçimlər daha aydın paneldə təqdim olunacaq.",
          "Məxfilik nəzarəti istifadəçi üçün tez tapılan yerdə qalmalıdır."
        ],
        ctaLabel: "Məxfilik siyasətinə bax",
        ctaHref: "/info/legal/maxfilik-siyaseti"
      }
    ]
  }
];

export function getFooterSections() {
  return infoSections.map((section) => ({
    slug: section.slug,
    label: section.label,
    pages: section.pages.map((page) => ({
      label: page.label,
      href:
        section.slug === "students" && page.slug === "karyera-meslehetleri"
          ? "/karyera-meslehetleri"
          : `/info/${section.slug}/${page.slug}`
    }))
  }));
}

export function getInfoPages(): InfoPage[] {
  return infoSections.flatMap((section) =>
    section.pages.map((page) => ({
      ...page,
      sectionSlug: section.slug,
      sectionLabel: section.label
    }))
  );
}

export function getInfoPage(sectionSlug: string, slug: string) {
  return getInfoPages().find((page) => page.sectionSlug === sectionSlug && page.slug === slug);
}
