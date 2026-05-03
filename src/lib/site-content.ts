export type InfoPage = {
  sectionSlug: string;
  sectionLabel: string;
  slug: string;
  label: string;
  title: string;
  description: string;
  intro: string;
  highlights: string[];
  usefulness?: string;
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
        description: "Təcrübə və təcrübəçi elanlarını ilk karyera addımına uyğun şəkildə müqayisə etmək üçün qısa bələdçi.",
        intro:
          "Stradify tələbələrə təcrübə proqramlarını səviyyə, iş modeli, son müraciət tarixi və mənbə etibarlılığına görə müqayisə etməyə kömək edir.",
        highlights: [
          "Təcrübə, giriş səviyyəsi və yeni məzun vakansiyaları ayrı-ayrılıqda göstərilir.",
          "Son müraciət tarixi yaxın olan elanlar daha rahat seçilir.",
          "Təsdiqlənmiş şirkət və mənbələr ayrıca qeyd olunur."
        ],
        usefulness:
          "Uyğun vakansiyanı daha tez tapmağa, mənbəni yoxlamağa və müraciət qərarını daha inamlı verməyə kömək edir.",
        ctaLabel: "Vakansiyalara bax",
        ctaHref: "/jobs"
      },
      {
        slug: "kim-ishe-goturur",
        label: "Kim işə qəbul edir",
        title: "Hazırda gəncləri kim işə qəbul edir",
        description: "Platformada hansı sektorların və şirkətlərin gənclər üçün daha aktiv vakansiya paylaşdığını göstərən qısa xəritə.",
        intro:
          "Bu səhifə gənclər üçün açıq vakansiya paylaşan şirkətləri və sahələri daha aydın görmək üçündür. Məqsəd bazardakı aktivliyi bir neçə mənbəni ayrıca gəzmədən izləməkdir.",
        highlights: [
          "Bank, pərakəndə satış, texnologiya və xidmət sektorları aktiv olduqda önə çıxır.",
          "Fərqli mənbələrdə yayımlanan elanları bir yerdə görmək daha asandır.",
          "Şirkət profili olan işəgötürənləri müqayisə etmək daha rahatdır."
        ],
        usefulness:
          "Hansı şirkətlərin hazırda işə qəbul etdiyini görməyə və vaxtını daha real fürsətlərə yönəltməyə kömək edir.",
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
          "Giriş səviyyəsi vakansiyaları üçün problem həlli və kommunikasiya nümunələri əlavə üstünlük yaradır.",
          "Müraciət etdiyin hər vakansiya üçün açar sözlərə uyğun qısa cover note hazırlamaq lazımdır."
        ],
        usefulness:
          "Müraciət materiallarını daha aydın qurmağa və vakansiya tələblərinə uyğunlaşdırmağa kömək edir.",
        ctaLabel: "Uyğun vakansiyaları filtrlə",
        ctaHref: "/jobs"
      },
      {
        slug: "careerapple-ai",
        label: "Uyğunluq dəstəyi",
        title: "Uyğun vakansiyaları daha tez seçmək",
        description: "Gələcək uyğunluq və CV dəstəyi barədə qısa baxış.",
        intro:
          "Uyğunluq dəstəyi vakansiyaları yalnız başlığa görə deyil, səviyyə, iş modeli, bacarıq siqnalları və mənbə məlumatına görə seçməyi hədəfləyir.",
        highlights: [
          "Vakansiya uyğunluğu üçün bacarıq əsaslı tövsiyələr veriləcək.",
          "CV-də boş qalan hissələr üçün redaktə təklifləri hazırlanacaq.",
          "Müraciətdə səni önə çıxaran güclü tərəflər daha aydın vurğulanacaq."
        ],
        usefulness:
          "Axtarış nəticələrini daraltmağa və müraciət etməyə dəyən elanları daha tez seçməyə kömək edəcək.",
        ctaLabel: "Ana səhifəyə bax",
        ctaHref: "/"
      },
      {
        slug: "fellowship-proqrami",
        label: "Fellowship proqramı",
        title: "Fellowship proqramı ilə mentorlu keçid modeli",
        description: "Gəncləri ilk vakansiyasına hazırlamaq üçün planlaşdırılan cohort və mentorluq proqramı.",
        intro:
          "Fellowship modeli seçilmiş namizədləri mentor görüşləri, praktik tapşırıqlar və qısa workshop-larla müraciət prosesinə hazırlamaq üçün düşünülüb.",
        highlights: [
          "Seçilmiş qruplar üzrə mentor sessiyaları planlanır.",
          "Partnyor şirkətlər üçün hazır namizəd hovuzu formalaşdırılır.",
          "Tələbə klubları və karyera mərkəzləri ilə ortaq proqramlar nəzərdə tutulur."
        ],
        usefulness:
          "Tələbəyə real iş mühitinə daha hazırlıqlı keçməyə, şirkətə isə daha uyğun namizədlərlə tanış olmağa kömək edir.",
        ctaLabel: "İşəgötürən səhifəsini oxu",
        ctaHref: "/for-employers"
      },
      {
        slug: "imkanlar",
        label: "İmkanlar",
        title: "İmkanlar bölməsində yalnız uyğun elanlar qalmalıdır",
        description: "Stradify-ın niyə təcrübə, giriş səviyyəsi və yeni məzun vakansiyalarına fokuslandığını izah edən qısa qeyd.",
        intro:
          "Gənclər üçün platformalarda əsas problem səs-küydür. Senior, rəhbər və əlaqəsiz elanlar ilk iş axtaran istifadəçini yorur. Buna görə imkanlar bölməsində yalnız mənbə ilə dəstəklənən uyğun elanlar qalmalıdır.",
        highlights: [
          "Filtrlər gənclərə uyğun səviyyələri daha tez önə çıxarır.",
          "Uyğun olmayan vakansiyalar əsas lentdə diqqəti dağıtmır.",
          "Seçilmiş bloklar yalnız real və etibarlı imkanları göstərir."
        ],
        usefulness:
          "İstifadəçinin vaxtını qoruyur və ilk baxışdan müraciətə dəyən elanları seçməyi asanlaşdırır.",
        ctaLabel: "Seçilmiş elanlara bax",
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
        description: "Stradify-ın işəgötürənə hansı üstünlükləri verdiyini göstərən qısa çərçivə.",
        intro:
          "Bu məhsul klassik job board kimi deyil. Məqsəd gənc auditoriya qarşısında daha güclü görünmək, daha uyğun namizədlər toplamaq və açıq vakansiyaları daha aydın təqdim etməkdir.",
        highlights: [
          "Seçilmiş yerləşdirmə erkən karyera vakansiyaları üçün daha güclü görünürlük yaradır.",
          "Aydın şəhər, son tarix və müraciət keçidi namizəd qərarını sürətləndirir.",
          "Etibarlı və səliqəli profil daha keyfiyyətli ilk təəssürat yaradır."
        ],
        ctaLabel: "İşəgötürən səhifəsinə keç",
        ctaHref: "/for-employers"
      },
      {
        slug: "demo-isteyi",
        label: "Demo istəyi",
        title: "Stradify demo istəyi və əməkdaşlıq çərçivəsi",
        description: "İşəgötürən komandalarının platformaya qoşulması üçün sadə və aydın başlanğıc.",
        intro:
          "Stradify şirkətlərə gənc auditoriya qarşısında daha aydın görünmək üçün qurulub. Demo mərhələsi komandanın ehtiyacını anlamaq və uyğun vakansiyaları daha yaxşı göstərmək üçündür.",
        highlights: [
          "Şirkət təqdimatı daha aydın və etibarlı görünəcək şəkildə hazırlanır.",
          "Vakansiyalar gənc auditoriya üçün daha rahat kəşf olunan formaya salınır.",
          "Demo mərhələsində əsas diqqət təcrübə və giriş səviyyəsi vakansiyalarına verilir."
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
          "Stradify təkcə işəgötürənlə namizədi deyil, universitet karyera mərkəzlərini də bu təcrübəyə qoşmağı planlayır. Məqsəd tələbələrə daha tez və daha etibarlı imkanlar çatdırmaqdır.",
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
        description: "İşəgötürənlərin təcrübə elanlarını daha yaxşı təqdim etməsi üçün istifadə ediləcək material seti.",
        intro:
          "Gənc istifadəçi üçün iş elanı sadəcə mətn deyil. Güclü başlıq, aydın xülasə, düzgün iş modeli və son tarix namizədin qərarını birbaşa gücləndirir.",
        highlights: [
          "Banner, qısa copy və etibar hissi birlikdə işləyir.",
          "Şirkət təqdimatı daha aydın görünməlidir.",
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
          "Stradify-da məqsəd namizədə daha etibarlı təcrübə verməkdir. Şirkət məlumatlarının aydınlığı və düzgün keçidlər bu etibarı gücləndirir.",
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
        description: "Stradify təcrübəsini aydın və etibarlı saxlayan əsas qaydalar.",
        intro:
          "Stradify istifadəçi və şirkət təcrübəsini aydın qaydalarla qoruyur. Bu bölmə platformada görünən məlumatlardan və təqdim olunan imkanlardan necə istifadə olunduğunu izah edir.",
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
        title: "Stradify məxfilik siyasəti",
        description: "Məlumatın qorunması və istifadəçi rahatlığı barədə qısa qeyd.",
        intro:
          "Stradify istifadəçi etibarını qorumağı vacib sayır. Məlumatın necə saxlanması və istifadəçi rahatlığının necə qorunması bu bölmədə sadə dillə izah olunur.",
        highlights: [
          "İstifadəçi məlumatları diqqətlə və ehtiyatla işlənir.",
          "Vacib seçimlər daha aydın və rahat görünəcək şəkildə saxlanılır.",
          "Məxfilik təcrübəsi istifadəçi etibarını qorumaq üçün davamlı olaraq yaxşılaşdırılır."
        ],
        ctaLabel: "Məxfilik seçimlərinə bax",
        ctaHref: "/info/support/maxfilik-secimlerin"
      },
      {
        slug: "menbe-siyaseti",
        label: "Etibar və elan siyasəti",
        title: "Elanlar üçün etibar və şəffaflıq siyasəti",
        description: "Stradify-da görünən elanların aydın və rahat təcrübə yaratması üçün əsas yanaşma.",
        intro:
          "Stradify-da elanlar istifadəçiyə aydın, etibarlı və rahat görünməlidir. Məqsəd namizədi uyğun vakansiyaya daha tez çatdırmaq və seçim anını sadələşdirməkdir.",
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
          "Stradify-da cookie istifadəsi istifadəçi təcrübəsini rahat saxlamaq üçündür. Məqsəd sürətli baxış, yadda saxlanan seçimlər və daha sabit təcrübə təqdim etməkdir.",
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
        title: "Stradify nə üçün yaradılıb",
        description: "Gənclər üçün təcrübə və ilk iş axtarışını daha təmiz və uyğun etmək məqsədi ilə qurulan məhsulun qısa hekayəsi.",
        intro:
          "Stradify-ın əsas ideyası sadədir: ilk iş axtaran istifadəçiyə ən vacib olanı daha tez göstərmək. Platforma buna görə təmiz görünüş, qısa copy və yüksək uyğunluq hissi üzərində qurulub.",
        highlights: [
          "Məhsul Azərbaycan bazarı və gənc auditoriya üçün lokallaşdırılır.",
          "İlk mərhələdə diqqət təcrübə, giriş səviyyəsi və mütəxəssis vakansiyalarındadır.",
          "Əsas fokus uyğun vakansiyanı daha tez tapdırmaqdır."
        ],
        ctaLabel: "Ana səhifəyə qayıt",
        ctaHref: "/"
      },
      {
        slug: "komandaya-qosul",
        label: "Komandaya qoşul",
        title: "Stradify komandasına necə qoşula bilərsən",
        description: "Məhsul, growth və community istiqamətində gələcək komanda genişlənməsi üçün qısa baxış.",
        intro:
          "Stradify böyüdükcə məhsul, growth və community istiqamətlərində güclü insanlara ehtiyac artacaq. Məqsəd gənclər üçün daha güclü karyera təcrübəsi qurmaqdır.",
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
        description: "Stradify-ı təqdim etmək üçün istifadə oluna biləcək sadə məhsul mövqeləndirməsi.",
        intro:
          "Stradify gənclər üçün təcrübə və ilk iş elanlarını təsdiqlənmiş işəgötürən profilləri ilə bir araya gətirən yerli karyera platformasıdır.",
        highlights: [
          "Məhsul dili qısa, yerli və müraciətə yönəlmiş saxlanılır.",
          "İstifadəçiyə görünən səhifələrdə sadə və aydın dil qorunur.",
          "Vizual sistem ağ fon, bənövşəyi vurğu və oxunaqlı kartlar üzərində qurulur."
        ],
        ctaLabel: "Brend qaydalarına bax",
        ctaHref: "/info/company/brend-qaydalari"
      },
      {
        slug: "blog",
        label: "Blog",
        title: "Blog üçün mövzu xəritəsi",
        description: "Stradify blogunda hansı mövzuların prioritet olacağına dair qısa redaksiya istiqaməti.",
        intro:
          "Blog Stradify-ın etibarını və faydasını gücləndirən kontent qatıdır. İlk mərhələdə təcrübə bazarı, CV məsləhətləri, junior müsahibə hazırlığı və işəgötürən dünyası əsas mövzulardır.",
        highlights: [
          "Terminlər Azərbaycan dilində aydın lokallaşdırılmalıdır.",
          "Hər yazı məhsuldakı konkret istifadəçi addımı ilə bağlanmalıdır.",
          "Blog kontenti vakansiya feed-indən ayrı, amma məhsulu gücləndirən qat kimi işləməlidir."
        ],
        ctaLabel: "Karyera məsləhətlərinə keç",
        ctaHref: "/karyera-meslehetleri"
      },
      {
        slug: "brend-qaydalari",
        label: "Brend qaydaları",
        title: "Stradify brend qaydaları",
        description: "Vizual dil, ton və etibar hissi üçün istifadə olunan əsas qaydalar.",
        intro:
          "Stradify vizual dili ağ fon, bənövşəyi vurğular və aydın məsafələr üzərində qurulub. Məhsul dili sadə, konkret və gənc auditoriya üçün anlaşılır saxlanılır.",
        highlights: [
          "San Francisco əsas tipografiya kimi istifadə olunur.",
          "Bənövşəyi vurğu yalnız əsas hərəkət və seçilmiş vəziyyətlərdə işlədilir.",
          "Kartlar və bannerlər sadə, oxunaqlı və məhsul məqsədinə uyğun saxlanılır."
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
          "Stradify-da əsas məqsəd uyğun vakansiyanı tez tapmaq, yadda saxlamaq və rahat müraciət etməkdir. Yardım mərkəzi bu təcrübəni daha aydın göstərmək üçündür.",
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
        title: "Stradify ilə əlaqə üçün əsas kanallar",
        description: "Demo, partnership və məhsul əməkdaşlığı üçün əlaqə çərçivəsi.",
        intro:
          "Stradify ilə əməkdaşlıq, demo və media sorğuları üçün ən rahat əlaqə yolu birbaşa e-poçtdur. Sorğunun mövzusunu qısa yazmaq cavabı sürətləndirir.",
        highlights: [
          "Demo və işəgötürən əməkdaşlığı sorğuları prioritetlə cavablandırılır.",
          "Universitet tərəfdaşlığı və fellowship maraqları ayrıca qeyd oluna bilər.",
          "Əlaqə ünvanı: contact@trystradify.app"
        ],
        usefulness:
          "Doğru mövzunu və əlaqə kanalını seçməyə, əməkdaşlıq sorğusunu daha aydın göndərməyə kömək edir.",
        ctaLabel: "İşəgötürən səhifəsinə bax",
        ctaHref: "/for-employers"
      },
      {
        slug: "huquq-merkezi",
        label: "Hüquq mərkəzi",
        title: "Hüquq mərkəzi və etibar qeydləri",
        description: "Etibar, məxfilik və istifadə şərtləri arasında keçid nöqtəsi.",
        intro:
          "Stradify-da hüquqi təməl yalnız sənəd olmaq üçün deyil. Məqsəd istifadəçi və şirkət tərəfi üçün etibarlı, aydın və şəffaf təcrübə yaratmaqdır.",
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
        usefulness:
          "Məxfilik seçimlərinin nə üçün lazım olduğunu və gələcəkdə necə idarə olunacağını sadə dillə göstərir.",
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
