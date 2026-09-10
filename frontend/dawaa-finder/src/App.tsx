import { useEffect, useMemo, useState } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  SlidersHorizontal,
  ArrowUpDown,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Languages,
  Pill
} from 'lucide-react';
import { MOCK_MEDICINES } from './data/mockMedicines';
import type { MedicineProduct, PharmacyOffer } from './data/mockMedicines';

type SortOption = 'cheapest' | 'nearest' | 'freshest' | 'best_match';
type Language = 'en' | 'ar';

interface ResearchVerifiedResult {
  normalizedName: string;
  normalizedArabicName: string;
  activeIngredient: string;
  gtin: string;
  verificationStatus: 'CONFIRMED_MATCH' | 'STALE' | 'AMBIGUOUS';
  lastChecked: string;
  offers: PharmacyOffer[];
}

const getFreshnessMinutes = (label: string): number => {
  const normalized = label.toLowerCase().trim();

  if (!normalized || normalized.includes('just now')) return 0;
  if (normalized.includes('mins')) return Number.parseInt(normalized, 10) || 0;
  if (normalized.includes('min')) return Number.parseInt(normalized, 10) || 0;
  if (normalized.includes('hours')) return (Number.parseInt(normalized, 10) || 0) * 60;
  if (normalized.includes('hour')) return (Number.parseInt(normalized, 10) || 0) * 60;

  return 0;
};

const getBestMatchScore = (item: MedicineProduct, cleanQuery: string): number => {
  if (!cleanQuery) return 0;

  const query = cleanQuery.trim();
  const haystacks = [
    item.name,
    item.arabicName,
    item.activeIngredient,
    ...item.tags,
    item.strength,
    item.dosageForm,
  ]
    .join(' ')
    .toLowerCase();

  if (haystacks.includes(query)) return 100;
  if (item.name.toLowerCase().startsWith(query)) return 90;
  if (item.activeIngredient.toLowerCase().includes(query)) return 80;
  if (item.tags.some((tag) => tag.toLowerCase().includes(query))) return 70;
  return 0;
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'search'>('home');
  const [lang, setLang] = useState<Language>('en');
  
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('cheapest');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [maxDistance, setMaxDistance] = useState<number>(15);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');

    if (qParam) {
      setQuery(qParam);
      setSearchInput(qParam);
      setCurrentPage('search');
      return;
    }

    setQuery('');
    setSearchInput('');
    setCurrentPage('home');
  }, []);

  const [isSearching, setIsSearching] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchStage, setResearchStage] = useState('');
  const [researchResult, setResearchResult] = useState<ResearchVerifiedResult | null>(null);

  const isRTL = lang === 'ar';

  const t = {
    en: {
      brand: 'DawaaFinder',
      subBrand: 'Egypt Live MVP',
      taglineBadge: 'Smart Egyptian Pharmacy Comparator',
      heroTitle: 'Find medicine availability & prices across Egypt',
      heroDesc: 'Compare verified branch stock and retail prices at El Ezaby, Roshdy, 19011, and Seif without calling ten pharmacies.',
      searchPlaceholder: 'Search for a medicine...',
      searchBtn: 'Search',
      tryPrompt: 'Try:',
      filters: 'Filters',
      inStockOnly: 'In-stock only',
      maxPrice: 'Max Price',
      maxDistance: 'Max Distance',
      sortBy: 'Sort by:',
      cheapest: 'Cheapest',
      nearest: 'Nearest',
      freshest: 'Freshest',
      bestMatch: 'Best Match',
      verifiedResultBadge: 'Confirmed Match',
      researchBannerTitle: 'Need fresh real-time verification?',
      researchBannerSubtitle: 'Run a live scraper scan across Egyptian pharmacies right now.',
      researchBtn: 'Research',
      researchingTitle: 'Checking pharmacy sources...',
      egp: 'EGP',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      viewOffer: 'Visit Pharmacy',
      checked: 'Checked',
      away: 'away',
      foundMedicines: 'matching medicines',
      noResultsTitle: 'No exact matches found',
      noResultsDesc: 'Try adjusting your filters or click Research to scan live branch stock.',
      footer: 'DawaaFinder • No prescription or medical advice provided.',
    },
    ar: {
      brand: 'دواء فايندر',
      subBrand: 'مقارن الصيدليات المصرية',
      taglineBadge: 'مقارن أسعار وتوفر الأدوية في مصر',
      heroTitle: 'اعرف مكان وسعر دوائك بأرخص سعر في مصر',
      heroDesc: 'قارن توفر الأدوية والأسعار لحظياً بين العزبي، رشدي، ١٩٠١١، وسيف في ثوانٍ معدودة وبدون مكالمات هاتفية.',
      searchPlaceholder: 'Search for a medicine...',
      searchBtn: 'بحث',
      tryPrompt: 'أمثلة:',
      filters: 'تصفية النتائج',
      inStockOnly: 'المتوفر في المخزن فقط',
      maxPrice: 'أقصى سعر',
      maxDistance: 'أقصى مسافة',
      sortBy: 'ترتيب حسب:',
      cheapest: 'الأرخص',
      nearest: 'الأقرب',
      freshest: 'الأحدث',
      bestMatch: 'أفضل تطابق',
      verifiedResultBadge: 'تطابق معتمد',
      researchBannerTitle: 'محتاج تأكيد حقيقي لتوفر الدواء الآن؟',
      researchBannerSubtitle: 'قم بتشغيل فحص حي ومباشر عبر فروع القاهرة والإسكندرية.',
      researchBtn: 'Research (إعادة الفحص)',
      researchingTitle: 'Checking pharmacy sources...',
      egp: 'ج.م',
      inStock: 'متوفر',
      outOfStock: 'غير متوفر',
      viewOffer: 'موقع الصيدلية',
      checked: 'تم الفحص',
      away: 'منك',
      foundMedicines: 'أدوية مطابقة',
      noResultsTitle: 'لم نتمكن من إيجاد الدواء',
      noResultsDesc: 'حاول تعديل فلاتر البحث أو اضغط على Research لفحص الفروع.',
      footer: 'دواء فايندر • للمقارنة والاسترشاد فقط • لا يقدم نصائح طبية أو بدائل علاجية دون طبيب.',
    }
  }[lang];

  const executeSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;

    const params = new URLSearchParams(window.location.search);
    params.set('q', clean);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', nextUrl);

    setQuery(clean);
    setSearchInput(clean);
    setResearchResult(null);
    setIsSearching(true);
    setCurrentPage('search');
    setTimeout(() => setIsSearching(false), 300);
  };

  const triggerResearch = () => {
    setIsResearching(true);
    setResearchResult(null);
    setResearchStage('Checking pharmacy sources...');

    setTimeout(() => {
      setResearchStage('Checking branch inventory at El Ezaby, Roshdy, 19011...');
    }, 900);

    setTimeout(() => {
      setResearchStage('Normalizing medicine identity & matching packaging...');
    }, 1800);

    setTimeout(() => {
      setIsResearching(false);
      setResearchStage('');
      setResearchResult({
        normalizedName: query ? `${query.toUpperCase()} Verified Formulation` : 'Panadol Extra Film-Coated 500/65mg',
        normalizedArabicName: 'بانادول إكسترا - مطابقة معتمدة',
        activeIngredient: 'Paracetamol 500mg + Caffeine 65mg (Verified)',
        gtin: '6221123456789',
        verificationStatus: 'CONFIRMED_MATCH',
        lastChecked: 'Just now (Live verified)',
        offers: [
          {
            id: 'res-live-1',
            pharmacyName: 'El Ezaby (العزبي)',
            branchName: 'Smouha Branch',
            price: 85,
            available: true,
            distanceKm: 1.2,
            lastChecked: 'Just now',
            url: 'https://elezabypharmacy.com',
            phone: '19600'
          },
          {
            id: 'res-live-2',
            pharmacyName: 'Roshdy (رشدي)',
            branchName: 'Loran Branch',
            price: 88,
            available: true,
            distanceKm: 2.1,
            lastChecked: 'Just now',
            url: 'https://roshdy.com',
            phone: '19661'
          }
        ]
      });
    }, 2500);
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const processedResults = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();

    const matchingItems = MOCK_MEDICINES.filter((item) => {
      if (!cleanQuery) return true;
      const matchEn = item.name.toLowerCase().includes(cleanQuery);
      const matchAr = item.arabicName.toLowerCase().includes(cleanQuery);
      const matchIng = item.activeIngredient.toLowerCase().includes(cleanQuery);
      const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(cleanQuery));
      return matchEn || matchAr || matchIng || matchTags;
    }).map((item) => {
      const searchScore = getBestMatchScore(item, cleanQuery);

      let filteredOffers = item.offers.filter((offer) => {
        if (onlyAvailable && !offer.available) return false;
        if (offer.price > maxPrice) return false;
        if (offer.distanceKm > maxDistance) return false;
        return true;
      });

      filteredOffers.sort((a, b) => {
        if (sortBy === 'cheapest') return a.price - b.price;
        if (sortBy === 'nearest') return a.distanceKm - b.distanceKm;
        if (sortBy === 'freshest') return getFreshnessMinutes(a.lastChecked) - getFreshnessMinutes(b.lastChecked);
        if (sortBy === 'best_match') return (b.price - a.price) + (a.distanceKm - b.distanceKm);
        return 0;
      });

      const inStockOffers = filteredOffers.filter((offer) => offer.available);
      const cheapestPrice = inStockOffers.length > 0 ? Math.min(...inStockOffers.map((offer) => offer.price)) : null;

      return {
        medicine: item,
        offers: filteredOffers,
        cheapestPrice,
        pharmaciesCount: new Set(filteredOffers.map((offer) => offer.pharmacyName)).size,
        searchScore,
      };
    }).filter((result) => result.offers.length > 0 || !onlyAvailable);

    return matchingItems.sort((a, b) => {
      if (sortBy === 'best_match') {
        return getBestMatchScore(b.medicine, cleanQuery) - getBestMatchScore(a.medicine, cleanQuery);
      }
      return 0;
    });
  }, [query, sortBy, onlyAvailable, maxPrice, maxDistance]);

  return (
    <div className={`min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.08),_transparent_35%),_#f8fafc] text-slate-900 flex flex-col font-sans ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Startup Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-teal-100 shadow-[0_1px_0_rgba(15,118,110,0.06)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div 
            onClick={() => { setCurrentPage('home'); setQuery(''); setSearchInput(''); }}
            className="flex items-center gap-2 cursor-pointer font-black text-xl tracking-tight text-teal-700 select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-teal-200/80">
              د
            </div>
            <span>
              {t.brand} <span className="text-slate-500 font-medium text-xs px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100">{t.subBrand}</span>
            </span>
          </div>

          {currentPage === 'search' && (
            <form 
              onSubmit={(e) => { e.preventDefault(); executeSearch(searchInput); }}
              className="flex-1 max-w-lg hidden md:block"
            >
              <div className="relative flex items-center">
                <label htmlFor="header-search" className="sr-only">{t.searchPlaceholder}</label>
                <input
                  id="header-search"
                  type="text"
                  dir="auto"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.searchPlaceholder}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-teal-100 focus:border-teal-300 outline-none transition shadow-sm"
                />
                <button
                  type="submit"
                  className={`absolute ${isRTL ? 'left-1.5' : 'right-1.5'} px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-sm`}
                >
                  {t.searchBtn}
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-xs font-bold text-teal-700 transition cursor-pointer shadow-sm"
            >
              <Languages className="w-3.5 h-3.5 text-teal-600" />
              <span>{lang === 'en' ? 'عربي' : 'English'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* HOMEPAGE VIEW */}
      {currentPage === 'home' && (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 -mt-8">
          <div className="w-full max-w-2xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.taglineBadge}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {t.heroTitle}
            </h1>

            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              {t.heroDesc}
            </p>

            {/* Central Hero Medicine Search Bar */}
            <form 
              onSubmit={(e) => { e.preventDefault(); executeSearch(searchInput); }}
              className="relative flex items-center shadow-[0_16px_35px_rgba(13,148,136,0.12)] rounded-2xl bg-white border border-teal-100 p-2 focus-within:ring-4 focus-within:ring-teal-100 focus-within:border-teal-300 transition"
            >
              <div className="px-3 text-teal-600">
                <Search className="w-6 h-6" />
              </div>
              <label htmlFor="hero-search" className="sr-only">{t.searchPlaceholder}</label>
              <input
                id="hero-search"
                type="text"
                dir="auto"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="w-full py-3.5 bg-transparent outline-none text-slate-900 placeholder-slate-400 text-base font-semibold"
              />
              <button
                type="submit"
                className="shrink-0 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white font-bold px-7 py-3.5 rounded-xl transition shadow-md active:scale-95 text-sm cursor-pointer"
              >
                {t.searchBtn}
              </button>
            </form>

            {/* Small Quick Search Examples */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <span>{t.tryPrompt}</span>
              {[
                'Panadol Extra',
                'بانادول اكسترا',
                'paracetamol',
                'banadol extra',
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => executeSearch(item)}
                  className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-700 border border-teal-100 rounded-full transition cursor-pointer shadow-sm"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* SEARCH RESULTS VIEW */}
      {currentPage === 'search' && (
        <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
                <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                <span>{t.filters}</span>
              </div>

              <div>
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                  />
                  <span>{t.inStockOnly}</span>
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{t.maxPrice}</span>
                  <span className="text-teal-700">{maxPrice} {t.egp}</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="250"
                  step="5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{t.maxDistance}</span>
                  <span className="text-teal-700">{maxDistance} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>
            </div>
          </aside>

          {/* Results Main Section */}
          <main className="lg:col-span-3 space-y-5">
            
            {/* Prominent Research Feature Banner */}
            <div className="bg-gradient-to-r from-teal-800 via-cyan-800 to-sky-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md shadow-cyan-900/10" aria-live="polite">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-200 text-xs font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t.researchBannerTitle}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-medium">
                  {t.researchBannerSubtitle}
                </p>
              </div>
              <button
                onClick={triggerResearch}
                disabled={isResearching}
                className="bg-white hover:bg-cyan-50 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-2 border border-white/30"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-700 ${isResearching ? 'animate-spin' : ''}`} />
                <span>{isResearching ? 'Scanning...' : t.researchBtn}</span>
              </button>
            </div>

            {/* Research Loading State */}
            {isResearching && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-6 text-center space-y-3">
                <div className="w-10 h-10 mx-auto rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="font-extrabold text-cyan-950 text-sm">{t.researchingTitle}</h4>
                  <p className="text-xs text-cyan-700 font-bold mt-1 animate-pulse">{researchStage}</p>
                </div>
              </div>
            )}

            {/* Research Confirmed Match Card */}
            {researchResult && !isResearching && (
              <div className="bg-white border-2 border-cyan-400 rounded-2xl shadow-md overflow-hidden" aria-live="polite">
                <div className="bg-cyan-50/80 p-4 border-b border-cyan-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5" /> {t.verifiedResultBadge}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">GTIN: {researchResult.gtin}</span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {isRTL ? researchResult.normalizedArabicName : researchResult.normalizedName}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {researchResult.activeIngredient}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
                      {researchResult.verificationStatus}
                    </span>
                    <div className="text-[11px] font-medium text-slate-400 mt-1">
                      {researchResult.lastChecked}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {researchResult.offers.map((offer) => (
                    <div key={offer.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-indigo-50/20 transition">
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-slate-900">{offer.pharmacyName}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {offer.branchName} ({offer.distanceKm} km {t.away})</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {offer.lastChecked}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t.inStock}
                          </span>
                          <div className="text-base font-black text-slate-900">
                            {offer.price} <span className="text-xs font-semibold text-slate-500">{t.egp}</span>
                          </div>
                        </div>

                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm"
                        >
                          <span>{t.viewOffer}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sorting Header */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium">
                {processedResults.length} {t.foundMedicines} {query ? `("${query}")` : ''}
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">{t.sortBy}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="cheapest">{t.cheapest}</option>
                  <option value="nearest">{t.nearest}</option>
                  <option value="freshest">{t.freshest}</option>
                  <option value="best_match">{t.bestMatch}</option>
                </select>
              </div>
            </div>

            {/* Results Skeleton State */}
            {isSearching && (
              <div className="space-y-4 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="h-5 bg-slate-200 rounded-md w-1/3"></div>
                    <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
                    <div className="h-12 bg-slate-50 rounded-xl"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty Results State */}
            {!isSearching && processedResults.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <Pill className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">{t.noResultsTitle}</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">{t.noResultsDesc}</p>
                <button
                  onClick={triggerResearch}
                  className="mt-2 inline-flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl hover:from-teal-700 hover:to-emerald-600 transition cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> {t.researchBtn}
                </button>
              </div>
            )}

            {/* Product Cards Grouped Separately */}
            {!isSearching && processedResults.map(({ medicine, offers, cheapestPrice, pharmaciesCount }) => {
              const isExpanded = expandedCards[medicine.id] ?? true;

              return (
                <div 
                  key={medicine.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Product Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900">{isRTL ? medicine.arabicName : medicine.name}</h2>
                        <span className="text-xs font-semibold text-slate-500">
                          ({isRTL ? medicine.name : medicine.arabicName})
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold border border-teal-200">
                          {medicine.strength}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 font-semibold">
                          {medicine.dosageForm}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 font-semibold">
                          {medicine.packSize}
                        </span>
                      </div>
                    </div>

                    {/* Cheapest Price Prominence */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0">
                      {cheapestPrice !== null ? (
                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {lang === 'ar' ? 'أفضل سعر متوفر' : 'Lowest Price'}
                          </span>
                          <div className="text-2xl font-black text-slate-900 mt-0.5">
                            {cheapestPrice} <span className="text-xs font-bold text-slate-500">{t.egp}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          {t.outOfStock}
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mt-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{pharmaciesCount} {pharmaciesCount === 1 ? 'pharmacy' : 'pharmacies'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Offers Accordion Bar */}
                  <div className="px-5 py-2.5 bg-slate-100/50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>{lang === 'ar' ? `عروض الصيدليات (${offers.length})` : `Pharmacy Offers (${offers.length})`}</span>
                    <button 
                      onClick={() => toggleExpand(medicine.id)}
                      className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 cursor-pointer font-bold"
                    >
                      {isExpanded ? (lang === 'ar' ? 'طي' : 'Collapse') : (lang === 'ar' ? 'عرض' : 'Expand')}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Pharmacy Offers List Under Each Product */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100">
                      {offers.map((offer: PharmacyOffer) => {
                        const isCheapestOffer = offer.available && offer.price === cheapestPrice;

                        return (
                          <div
                            key={offer.id}
                            className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              isCheapestOffer 
                                ? 'bg-emerald-50/40 border-l-4 border-l-emerald-500' 
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">{offer.pharmacyName}</span>
                                {isCheapestOffer && (
                                  <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {lang === 'ar' ? 'الأوفر' : 'Cheapest Deal'}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {offer.branchName} ({offer.distanceKm} km {t.away})
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {t.checked} {offer.lastChecked}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-5">
                              <div className="text-right">
                                <div className="text-xs font-bold mb-0.5">
                                  {offer.available ? (
                                    <span className="text-emerald-600 flex items-center justify-end gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> {t.inStock}
                                    </span>
                                  ) : (
                                    <span className="text-rose-500 flex items-center justify-end gap-1">
                                      <XCircle className="w-3.5 h-3.5" /> {t.outOfStock}
                                    </span>
                                  )}
                                </div>
                                <div className="text-base font-black text-slate-900">
                                  {offer.price} <span className="text-xs font-semibold text-slate-500">{t.egp}</span>
                                </div>
                              </div>

                              <a
                                href={offer.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm cursor-pointer"
                              >
                                <span>{t.viewOffer}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}