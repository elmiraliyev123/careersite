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
        description: "İnternship və trainee elanlarını karyera başlanğıcına uyğun filtr və siqnallarla izləmək üçün hazırlanmış bələdçi.",
        intro:
          "CareerApple tələbələrə yalnız elan siyahısı vermir. Platforma rol səviyyəsi, iş modeli, deadline və şirkət etibarı kimi siqnalları birləşdirərək ilk karyera qərarını sürətləndirmək üçün qurulub.",
        highlights: [
          "Təcrübə, trainee və yeni məzun rolları ayrıca indekslənir.",
          "Deadline-a yaxın və yeni paylaşılmış elanlar ayrıca görünür.",
          "Verified şirkət badge-i yalnız admin tərəfindən yoxlanılmış profillərə verilir."
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
          "Azerbaycan bazarında gənclər üçün ən çox elan açan komandalar adətən data, marketinq, müştəri təcrübəsi, satış dəstəyi və product operations istiqamətlərində yerləşir. CareerApple bu axını tək lentdə toplamaq üçündür.",
        highlights: [
          "Bank, fintex, FMCG və SaaS komandaları daha çox entry-level rol açır.",
          "LinkedIn və yerli platformalardan gələn elanlar eyni freshness qaydası ilə sıralanır.",
          "Admin yalnız şirkət profili olan işəgötürənlərin elanlarını avtomatik import edir."
        ],
        ctaLabel: "Fresh elanlara keç",
        ctaHref: "/jobs"
      },
      {
        slug: "karyera-meslehetleri",
        label: "Karyera məsləhətləri",
        title: "İlk müraciət üçün praktik karyera məsləhətləri",
        description: "CV, portfoliо, cover note və müsahibə mərhələsi üçün gənclərə fokuslanan əsas istiqamətlər.",
        intro:
          "Gənc namizədlər üçün əsas fərq illərin sayı deyil, siqnalların keyfiyyətidir. Portfolion, mini layihələrin, analitik düşüncə və yazılı təqdimatın tez-tez təcrübədən daha çox təsir edir.",
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
        title: "CareerApple AI namizəd axınını necə dəstəkləyəcək",
        description: "Gələcək mərhələdə platformaya əlavə olunacaq ağıllı uyğunluq və CV köməkçisi barədə kontur.",
        intro:
          "CareerApple AI hazırkı mərhələdə ictimai funksionallıq kimi açıq deyil, amma məhsul planında CV siqnallarını, açar bacarıqları və rol uyğunluğunu analiz edən yardımçı qat kimi nəzərdə tutulur.",
        highlights: [
          "Rol uyğunluğu üçün bacarıq əsaslı tövsiyələr veriləcək.",
          "CV-də boş qalan hissələr üçün redaktə təklifləri hazırlanacaq.",
          "Eyni rola çoxlu müraciət edən istifadəçilər üçün fərqləndirici siqnallar vurğulanacaq."
        ],
        ctaLabel: "Məhsul axınını gör",
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
          "Seçilmiş cohort-lar üzrə mentor review sessiyaları planlanır.",
          "Partnyor şirkətlər üçün hazır namizəd hovuzu formalaşdırılır.",
          "Tələbə klubları və karyera mərkəzləri ilə ortaq proqramlar nəzərdə tutulur."
        ],
        ctaLabel: "İşəgötürən axınını oxu",
        ctaHref: "/for-employers"
      },
      {
        slug: "imkanlar",
        label: "İmkanlar",
        title: "İmkanlar lentində yalnız relevat elanlar qalmalıdır",
        description: "CareerApple feed-in niyə yalnız internship, junior və yeni məzun rolları üzərində qurulduğunu izah edən qeyd.",
        intro:
          "Gənclər üçün məhsullarda əsas problem səs-küydür. Senior və alakasız elanlar ilk iş axtaran istifadəçini itirir. Ona görə platforma yalnız erkən karyera siqnallarını ayrıca səviyyə kimi saxlayır.",
        highlights: [
          "Filter default olaraq gənclərə uyğun səviyyələri önə çıxarır.",
          "Scrape pipeline uyğun olmayan rolları avtomatik rədd edir.",
          "Seçilmiş banner yalnız təsdiqlənmiş şirkət və youth-role kombinasiyasından qurulur."
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
        title: "İşəgötürən üçün məhsul ölçüləri və qiymətləndirmə modeli",
        description: "CareerApple employer tərəfinin hansı ölçülərlə dəyər yaratdığını göstərən qısa çərçivə.",
        intro:
          "Bu məhsul klassik job board kimi deyil, gənc auditoriya üçün daha fokuslu discovery və conversion qatıdır. Ona görə əsas metriklər apply deyil, doğru apply, save, açılış sürəti və profil uyğunluğu olacaq.",
        highlights: [
          "Featured yerləşdirmə yalnız uyğun səviyyəli elanlar üçün nəzərdə tutulur.",
          "Deadline, city və source freshness conversion keyfiyyətinə birbaşa təsir edir.",
          "Admin review qatından keçən şirkətlər platformada təsdiqlənmiş kimi görünür."
        ],
        ctaLabel: "İşəgötürən səhifəsinə keç",
        ctaHref: "/for-employers"
      },
      {
        slug: "demo-isteyi",
        label: "Demo istəyi",
        title: "CareerApple demo istəyi və onboarding konturu",
        description: "İşəgötürən komandalarının platformaya qoşulması üçün sadə onboarding axını.",
        intro:
          "Hazırkı məhsul mərhələsində employer onboarding admin tərəfindən idarə olunur. Şirkət profili yaradılır, təsdiqlənir və yalnız bundan sonra uyğun elanlar public lentə daxil edilir.",
        highlights: [
          "Şirkət profili admin tərəfindən qurulur və yoxlanılır.",
          "Scraped elanlar yalnız mövcud company profili ilə match olanda import olunur.",
          "Demo mərhələsində prioritet fokus internship və yeni məzun rollarıdır."
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
          "CareerApple təkcə işəgötürənlə namizədi deyil, universitet karyera mərkəzlərini də məhsul axınına qoşmağı planlayır. Bu, tələbələrə daha tez vaxtda etibarlı elanlar çatdırmaq üçündür.",
        highlights: [
          "Karyera mərkəzləri üçün paylaşım dəstləri və seçilmiş vakansiya feed-ləri nəzərdə tutulur.",
          "Fellowship və event axını universitet tərəfi ilə birgə qurula bilər.",
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
          "Gənc istifadəçi üçün iş elanı yalnız mətn deyil. Güclü title, aydın summary, doğru iş modeli və deadline siqnalı conversion-a birbaşa təsir edir. Ona görə platforma employer kontenti üçün aydın çərçivə tələb edir.",
        highlights: [
          "Banner, qısa copy və təsdiq statusu birlikdə istifadə olunur.",
          "Admin keyfiyyət standartına uyğun olmayan copy-ni moderasiya edir.",
          "Scrape ilə gələn elanlar public görünməzdən əvvəl uyğunluq yoxlanır."
        ],
        ctaLabel: "İşəgötürən səhifəsinə keç",
        ctaHref: "/for-employers"
      },
      {
        slug: "tehlukesizlik",
        label: "Təhlükəsizlik",
        title: "Şirkət profili və elan axınında təhlükəsizlik qaydaları",
        description: "Verified badge, admin review və source nəzarəti ilə bağlı əsas prinsiplər.",
        intro:
          "CareerApple-da company profile public öz-özünə açılmır. Admin sessiyası, ayrılmış giriş ünvanı və review mərhələsi şirkət məlumatlarının və elanların keyfiyyətini qorumaq üçün tələb olunur.",
        highlights: [
          "Admin girişi ayrıca parol və signed session ilə qorunur.",
          "Public istifadəçilər üçün company yaratma və admin keçidi göstərilmir.",
          "Source URL və source adı saxlanaraq imported elanların izi qorunur."
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
        description: "CareerApple-ın public feed, admin girişi və məlumat istifadəsi üçün əsas davranış qaydaları.",
        intro:
          "Məhsul hazırda MVP mərhələsində olsa da, istifadəçi və employer data axını aydın qaydalarla idarə olunmalıdır. Bu bölmə platforma daxilində görünən məlumatlardan və public axından necə istifadə edildiyini izah edir.",
        highlights: [
          "Public istifadəçi yalnız açıq elanları və karyera resurslarını görə bilir.",
          "Admin əməliyyatları ayrıca giriş nöqtəsi və gizli mühit dəyişənləri ilə idarə olunur.",
          "Source-lardan gələn elanlar platforma daxilində moderasiya edilə bilər."
        ],
        ctaLabel: "Məxfilik siyasətinə bax",
        ctaHref: "/info/legal/maxfilik-siyaseti"
      },
      {
        slug: "maxfilik-siyaseti",
        label: "Məxfilik",
        title: "CareerApple məxfilik siyasəti üçün məhsul konturu",
        description: "Sessiya, tətbiq davranışı və analytics toplama prinsipləri barədə qısa qeyd.",
        intro:
          "Public auth hazırda bağlı olsa da, admin sessiyası, local fəaliyyət yaddaşı və gələcək analytics qatı üçün məlumatın necə emal olunacağı əvvəlcədən aydınlaşdırılmalıdır.",
        highlights: [
          "Admin sessiyası HTTP-only cookie ilə saxlanılır.",
          "Namizəd tərəfində tətbiq və save davranışı hazırda lokal cihazda saxlanılır.",
          "Production mərhələsində server-side audit log və privacy controls əlavə olunmalıdır."
        ],
        ctaLabel: "Privacy seçimlərinə bax",
        ctaHref: "/info/support/maxfilik-secimlerin"
      },
      {
        slug: "menbe-siyaseti",
        label: "Mənbə siyasəti",
        title: "Scrape edilmiş elanlar üçün mənbə siyasəti",
        description: "LinkedIn və yerli platformalardan gələn elanların platformaya necə daxil edildiyini izah edən qeyd.",
        intro:
          "CareerApple birbaşa scrape olunan elanları kor şəkildə yayınlamır. Mənbə siqnalı, matching, freshness və admin review birlikdə işlədikdən sonra elan public feed-ə düşür.",
        highlights: [
          "Source URL saxlanılır və orijinal elanla əlaqə qorunur.",
          "Keyword filtrinə uyğun gəlməyən rollar import edilmir.",
          "Company profile tapılmayan elanlar review üçün kənarda saxlanılır."
        ],
        ctaLabel: "Scrape modelini oxu",
        ctaHref: "/info/employers/tehlukesizlik"
      },
      {
        slug: "kukiler",
        label: "Cookie seçimləri",
        title: "Cookie və sessiya davranışı",
        description: "Admin girişi və tətbiq davranışının texniki olaraq necə saxlandığı barədə qısa izah.",
        intro:
          "Bu mərhələdə cookie istifadəsi minimaldır və əsasən admin sessiyasını qorumaq üçündür. Public tərəfdə login bağlandığı üçün cookie səthi məhduddur.",
        highlights: [
          "Admin session cookie-si yalnız HTTP-only formatında yaradılır.",
          "Public feed üçün məcburi olmayan cookie axını yoxdur.",
          "Gələcək analytics əlavə olunanda ayrıca consent axını tələb olunacaq."
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
          "CareerApple-ın əsas ideyası sadədir: ilk iş axtaran istifadəçi üçün ən vacib siqnalı tez göstərmək. Platforma ona görə qaranlıq mövzu, qısa copy və yüksək relevance üzərində qurulub.",
        highlights: [
          "Məhsul Azərbaycan bazarı və gənc auditoriya üçün lokallaşdırılır.",
          "İlk mərhələdə diqqət internship, trainee və junior axınındadır.",
          "Public company qovluğu hələ açılmayıb; əsas fokus vakansiya discovery-sidir."
        ],
        ctaLabel: "Ana səhifəyə qayıt",
        ctaHref: "/"
      },
      {
        slug: "komandaya-qosul",
        label: "Komandaya qoşul",
        title: "CareerApple komandaya necə qoşulur",
        description: "Məhsul, growth və community istiqamətində gələcək komanda genişlənməsi üçün prinsip və ehtiyaclar.",
        intro:
          "Hazırkı repo məhsul skeleton-u və admin pipeline-ını qurur. Növbəti mərhələdə real product growth üçün data, growth, design systems və partnerships bacarıqları vacib olacaq.",
        highlights: [
          "Product engineering və scraping/data pipeline sahələri prioritetdir.",
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
          "CareerApple gənclər üçün internship və ilk iş elanlarını təsdiqlənmiş employer profilləri və mənbə-izli scraping ilə toplayan yerli karyera platformasıdır.",
        highlights: [
          "Məhsul copy-si qısa, local və action-first yanaşma ilə yazılır.",
          "Public səhifələrdə admin və daxili idarəetmə istinadları gizli saxlanılır.",
          "Məhsul dizaynında lime-on-black identikası qorunur."
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
          "Blog platformanın SEO və trust qatıdır. İlk mərhələdə internship bazarı, CV məsləhətləri, junior interview hazırlığı və employer insight mövzuları əsas istiqamət kimi nəzərdə tutulur.",
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
        description: "Vizual dil, ton və təsdiq siqnalları üçün istifadə olunan əsas qaydalar.",
        intro:
          "CareerApple vizual dili tünd fon, lime vurğular və aydın spacing üzərində qurulub. Məhsul dili də eyni dərəcədə sadə, sürətli və gənc auditoriya üçün anlaşılır saxlanılır.",
        highlights: [
          "San Francisco əsas tipografiya kimi istifadə olunur.",
          "Lime accent yalnız vacib action və verification siqnallarında işlədilir.",
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
        description: "Vakansiya axtarışı, save/apply davranışı və admin review ilə bağlı əsas sualların cavabları.",
        intro:
          "Hazırkı MVP-də ən əsas user action vakansiya kəşfi, save, apply və source link-ə keçiddir. Yardım mərkəzi bu minimal axınları daha tez anlamaq üçündür.",
        highlights: [
          "Axtarış və filtr axını public istifadəçilər üçün açıqdır.",
          "Namizəd login və signup hələ aktiv deyil.",
          "Admin hissəsi ayrıca giriş ünvanı ilə qorunur və public səthdə görünmür."
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
          "Hazırkı mərhələdə əlaqə axını manual idarə olunur. İşəgötürən onboarding, community partnership və media sorğuları ayrı-ayrı axınlar kimi idarə edilməlidir.",
        highlights: [
          "Demo və company onboarding review əsas prioritetdir.",
          "University partnership və fellowship maraqları ayrıca toplana bilər.",
          "Məhsul support sorğuları hüquq və privacy suallarından ayrı saxlanmalıdır."
        ],
        ctaLabel: "İşəgötürən səhifəsinə bax",
        ctaHref: "/for-employers"
      },
      {
        slug: "huquq-merkezi",
        label: "Hüquq mərkəzi",
        title: "Hüquq mərkəzi və compliance qeydləri",
        description: "Source policy, privacy və istifadə şərtləri arasında keçid nöqtəsi.",
        intro:
          "CareerApple-da hüquqi təməl yalnız sənəd olmaq üçün deyil, data axınının necə idarə olunduğunu aydın göstərmək üçündür. Scrape pipeline, verified company modeli və admin access bu mərkəzdə birləşir.",
        highlights: [
          "Source-lardan gələn məlumatın izlenebilirliyi qorunmalıdır.",
          "Company profile və elan moderasiyası eyni review standartına bağlıdır.",
          "Production launch üçün ayrıca hüquqi mətnlər genişləndirilməlidir."
        ],
        ctaLabel: "Hüquq səhifələrini aç",
        ctaHref: "/info/legal/istifade-sertleri"
      },
      {
        slug: "maxfilik-secimlerin",
        label: "Məxfilik seçimlərin",
        title: "Məxfilik seçimlərini necə idarə etməliyik",
        description: "İstifadəçi seçimi, analytics və cookie nəzarəti üçün gələcək məhsul davranışı barədə qeyd.",
        intro:
          "Məxfilik seçimləri MVP mərhələsində hələ geniş UI kimi açılmayıb. Amma məhsul artıq gələcəkdə lazım olacaq consent və analytics nəzarəti üçün sadə bir yol xəritəsi saxlayır.",
        highlights: [
          "Hazırkı mərhələdə minimal session istifadəsi var.",
          "Analytics və marketing cookies əlavə olunanda ayrıca seçim paneli qurulmalıdır.",
          "User trust üçün privacy controls footer-dən tez tapılmalıdır."
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
