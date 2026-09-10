import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RefreshCw,
  Languages,
  Pill,
  Phone,
  LocateFixed,
  AlertTriangle,
  Map as MapIcon
} from 'lucide-react';
import {
  searchMedicines,
  researchAvailability,
  requestBrowserLocation,
  CAIRO_CENTRE
} from './services/api';
import type {
  AiAssist,
  MedicineProduct,
  PharmacyOffer,
  ResearchResponse,
  SortOption,
  UserLocation
} from './services/api';

type Language = 'en' | 'ar';

/** Offer ordering inside a product card. Product ordering comes from the API. */
const OFFER_COMPARATORS: Record<SortOption, (a: PharmacyOffer, b: PharmacyOffer) => number> = {
  cheapest: (a, b) => Number(b.available) - Number(a.available) || a.price - b.price,
  nearest: (a, b) => a.distanceKm - b.distanceKm,
  freshest: (a, b) => Date.parse(b.lastCheckedIso) - Date.parse(a.lastCheckedIso),
  best_match: (a, b) => Number(b.available) - Number(a.available) || a.price - b.price
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'search'>('home');
  const [lang, setLang] = useState<Language>('en');

  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('cheapest');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(250);
  const [maxDistance, setMaxDistance] = useState<number>(20);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Server data
  const [medicines, setMedicines] = useState<MedicineProduct[]>([]);
  const [aiAssist, setAiAssist] = useState<AiAssist>({ status: 'not_needed' });
  const [freshnessNote, setFreshnessNote] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Location
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Research mode
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [research, setResearch] = useState<ResearchResponse | null>(null);

  const isRTL = lang === 'ar';
  const requestRef = useRef<AbortController | null>(null);

  const t = {
    en: {
      brand: 'DawaaFinder',
      subBrand: 'Egypt demo',
      taglineBadge: 'Egyptian pharmacy price & availability comparison',
      heroTitle: 'Find medicine availability & prices across Egypt',
      heroDesc: 'Compare demo branch stock and retail prices across Cairo and Giza pharmacies instead of calling ten of them.',
      searchPlaceholder: 'Search for a medicine...',
      searchBtn: 'Search',
      tryPrompt: 'Try:',
      filters: 'Filters',
      inStockOnly: 'In-stock only',
      maxPrice: 'Max Price',
      maxDistance: 'Max Distance',
      location: 'Location',
      useLocation: 'Use my location',
      locating: 'Locating...',
      noLocation: 'Location off — distances are catalog estimates',
      sortBy: 'Sort by:',
      cheapest: 'Cheapest',
      nearest: 'Nearest',
      freshest: 'Freshest',
      bestMatch: 'Best Match',
      researchBannerTitle: 'Re-check nearby branches',
      researchBannerSubtitle: 'Run a fresh check of the branches near you and see each source’s verification status.',
      researchBtn: 'Research',
      researching: 'Checking pharmacy sources...',
      researchHeading: 'Research result',
      egp: 'EGP',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      viewOffer: 'Pharmacy site',
      call: 'Call',
      map: 'Map',
      checked: 'Checked',
      away: 'away',
      foundMedicines: 'matching medicines',
      noResultsTitle: 'No matches found',
      noResultsDesc: 'Try a different spelling, or search by active ingredient.',
      errorTitle: 'Could not reach the search API',
      errorDesc: 'Start the backend with `npm --prefix backend start`, then search again.',
      retry: 'Try again',
      aiBadge: 'AI-assisted match',
      unverified: 'Not live-verified',
      footer: 'DawaaFinder • Demo data • No prescription or medical advice provided.'
    },
    ar: {
      brand: 'دواء فايندر',
      subBrand: 'نسخة تجريبية',
      taglineBadge: 'مقارنة أسعار وتوفر الأدوية في مصر',
      heroTitle: 'اعرف مكان وسعر دوائك في مصر',
      heroDesc: 'قارن الأسعار والتوفر بين صيدليات القاهرة والجيزة في ثوانٍ وبدون مكالمات هاتفية.',
      searchPlaceholder: 'ابحث عن دواء...',
      searchBtn: 'بحث',
      tryPrompt: 'أمثلة:',
      filters: 'تصفية النتائج',
      inStockOnly: 'المتوفر فقط',
      maxPrice: 'أقصى سعر',
      maxDistance: 'أقصى مسافة',
      location: 'الموقع',
      useLocation: 'استخدم موقعي',
      locating: 'جارٍ تحديد الموقع...',
      noLocation: 'الموقع غير مُفعّل — المسافات تقديرية',
      sortBy: 'ترتيب حسب:',
      cheapest: 'الأرخص',
      nearest: 'الأقرب',
      freshest: 'الأحدث',
      bestMatch: 'أفضل تطابق',
      researchBannerTitle: 'إعادة فحص الفروع القريبة',
      researchBannerSubtitle: 'أعد فحص الفروع القريبة منك واعرف حالة التحقق لكل مصدر.',
      researchBtn: 'إعادة الفحص',
      researching: 'جارٍ فحص مصادر الصيدليات...',
      researchHeading: 'نتيجة الفحص',
      egp: 'ج.م',
      inStock: 'متوفر',
      outOfStock: 'غير متوفر',
      viewOffer: 'موقع الصيدلية',
      call: 'اتصل',
      map: 'الخريطة',
      checked: 'تم الفحص',
      away: 'منك',
      foundMedicines: 'أدوية مطابقة',
      noResultsTitle: 'لا توجد نتائج',
      noResultsDesc: 'جرّب كتابة الاسم بشكل مختلف أو ابحث بالمادة الفعالة.',
      errorTitle: 'تعذّر الوصول إلى خدمة البحث',
      errorDesc: 'شغّل الخدمة بالأمر `npm --prefix backend start` ثم أعد البحث.',
      retry: 'حاول مرة أخرى',
      aiBadge: 'تطابق بمساعدة الذكاء الاصطناعي',
      unverified: 'غير مُتحقَّق لحظياً',
      footer: 'دواء فايندر • بيانات تجريبية • لا يقدم نصائح طبية أو وصفات.'
    }
  }[lang];

  // Read ?q= on first load so search results are linkable.
  useEffect(() => {
    const qParam = new URLSearchParams(window.location.search).get('q');
    if (qParam) {
      setQuery(qParam);
      setSearchInput(qParam);
      setCurrentPage('search');
    }
  }, []);

  const runSearch = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await searchMedicines({
        query,
        sort: sortBy,
        availableOnly: onlyAvailable,
        location,
        signal: controller.signal
      });
      setMedicines(response.results);
      setAiAssist(response.aiAssist);
      setFreshnessNote(response.freshnessNote);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setMedicines([]);
      setSearchError((error as Error).message);
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, [query, sortBy, onlyAvailable, location]);

  // Sorting and availability filtering happen on the server, so any change to
  // them refetches rather than re-sorting a stale local list.
  useEffect(() => {
    if (currentPage !== 'search' || !query) return;
    void runSearch();
    return () => requestRef.current?.abort();
  }, [currentPage, query, runSearch]);

  const executeSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;

    const params = new URLSearchParams(window.location.search);
    params.set('q', clean);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    setQuery(clean);
    setSearchInput(clean);
    setResearch(null);
    setResearchError(null);
    setCurrentPage('search');
  };

  const enableLocation = async () => {
    setIsLocating(true);
    try {
      const coords = await requestBrowserLocation();
      setLocation(coords);
      setLocationLabel(lang === 'ar' ? 'موقعك الحالي' : 'Your current location');
    } catch {
      // Denied or unavailable: fall back to a labelled default so "nearest"
      // still demonstrates real distance maths.
      setLocation(CAIRO_CENTRE);
      setLocationLabel(lang === 'ar' ? 'وسط القاهرة (افتراضي)' : 'Cairo centre (default)');
    } finally {
      setIsLocating(false);
    }
  };

  const triggerResearch = async () => {
    setIsResearching(true);
    setResearchError(null);
    setResearch(null);
    try {
      let coords = location;
      if (!coords) {
        try {
          coords = await requestBrowserLocation();
          setLocation(coords);
          setLocationLabel(lang === 'ar' ? 'موقعك الحالي' : 'Your current location');
        } catch {
          coords = CAIRO_CENTRE;
          setLocation(coords);
          setLocationLabel(lang === 'ar' ? 'وسط القاهرة (افتراضي)' : 'Cairo centre (default)');
        }
      }
      setResearch(await researchAvailability({ query, location: coords }));
    } catch (error) {
      setResearchError((error as Error).message);
    } finally {
      setIsResearching(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Price and distance are slider filters with no server equivalent, so they
  // narrow the offers the server already returned.
  const processedResults = useMemo(
    () =>
      medicines
        .map((medicine) => {
          const offers = medicine.offers
            .filter((offer) => offer.price <= maxPrice && offer.distanceKm <= maxDistance)
            .sort(OFFER_COMPARATORS[sortBy]);
          const inStock = offers.filter((offer) => offer.available);

          return {
            medicine,
            offers,
            cheapestPrice: inStock.length ? Math.min(...inStock.map((offer) => offer.price)) : null,
            pharmaciesCount: new Set(offers.map((offer) => offer.pharmacyName)).size
          };
        })
        .filter((result) => result.offers.length > 0),
    [medicines, maxPrice, maxDistance, sortBy]
  );

  const renderOfferRow = (offer: PharmacyOffer, isCheapest: boolean) => (
    <div
      key={offer.id}
      className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        isCheapest ? 'bg-emerald-50/40 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50/70'
      }`}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-slate-900 text-sm">{offer.pharmacyName}</span>
          {isCheapest && (
            <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
              {lang === 'ar' ? 'الأوفر' : 'Cheapest'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {offer.branchName}
            {offer.city ? `, ${offer.city}` : ''} ({offer.distanceKm} km {t.away})
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {t.checked} {offer.lastChecked}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4">
        <div className={isRTL ? 'text-left' : 'text-right'}>
          <div className="text-xs font-bold mb-0.5">
            {offer.available ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t.inStock}
              </span>
            ) : (
              <span className="text-rose-500 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> {t.outOfStock}
              </span>
            )}
          </div>
          <div className="text-base font-black text-slate-900">
            {offer.price} <span className="text-xs font-semibold text-slate-500">{t.egp}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {offer.phone && (
            <a
              href={`tel:${offer.phone}`}
              className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-2.5 py-1.5 rounded-xl text-xs transition shadow-sm"
              title={`${t.call} ${offer.phone}`}
            >
              <Phone className="w-3 h-3" />
              <span className="hidden sm:inline">{t.call}</span>
            </a>
          )}
          {offer.mapsUrl && (
            <a
              href={offer.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-2.5 py-1.5 rounded-xl text-xs transition shadow-sm"
            >
              <MapIcon className="w-3 h-3" />
              <span className="hidden sm:inline">{t.map}</span>
            </a>
          )}
          {offer.url && (
            <a
              href={offer.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 font-bold px-2.5 py-1.5 rounded-xl text-xs transition shadow-sm"
            >
              <span className="hidden sm:inline">{t.viewOffer}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.08),_transparent_35%),_#f8fafc] text-slate-900 flex flex-col font-sans ${
        isRTL ? 'text-right' : 'text-left'
      }`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-teal-100 shadow-[0_1px_0_rgba(15,118,110,0.06)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setCurrentPage('home');
              setQuery('');
              setSearchInput('');
              setMedicines([]);
              setResearch(null);
              window.history.replaceState({}, '', window.location.pathname);
            }}
            className="flex items-center gap-2 cursor-pointer font-black text-xl tracking-tight text-teal-700 select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-teal-200/80">
              د
            </div>
            <span>
              {t.brand}{' '}
              <span className="text-slate-500 font-medium text-xs px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100">
                {t.subBrand}
              </span>
            </span>
          </button>

          {currentPage === 'search' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch(searchInput);
              }}
              className="flex-1 max-w-lg hidden md:block"
            >
              <div className="relative flex items-center">
                <label htmlFor="header-search" className="sr-only">
                  {t.searchPlaceholder}
                </label>
                <input
                  id="header-search"
                  type="text"
                  dir="auto"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t.searchPlaceholder}
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

          <button
            onClick={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-xs font-bold text-teal-700 transition cursor-pointer shadow-sm shrink-0"
          >
            <Languages className="w-3.5 h-3.5 text-teal-600" />
            <span>{lang === 'en' ? 'عربي' : 'English'}</span>
          </button>
        </div>
      </header>

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
            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">{t.heroDesc}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch(searchInput);
              }}
              className="relative flex items-center shadow-[0_16px_35px_rgba(13,148,136,0.12)] rounded-2xl bg-white border border-teal-100 p-2 focus-within:ring-4 focus-within:ring-teal-100 focus-within:border-teal-300 transition"
            >
              <div className="px-3 text-teal-600">
                <Search className="w-6 h-6" />
              </div>
              <label htmlFor="hero-search" className="sr-only">
                {t.searchPlaceholder}
              </label>
              <input
                id="hero-search"
                type="text"
                dir="auto"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full py-3.5 bg-transparent outline-none text-slate-900 placeholder-slate-400 text-base font-semibold"
              />
              <button
                type="submit"
                className="shrink-0 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white font-bold px-7 py-3.5 rounded-xl transition shadow-md active:scale-95 text-sm cursor-pointer"
              >
                {t.searchBtn}
              </button>
            </form>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <span>{t.tryPrompt}</span>
              {['Panadol Extra', 'بانادول اكسترا', 'paracetamol', 'brufen', 'nexiam 40'].map((item) => (
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

      {currentPage === 'search' && (
        <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
                <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                <span>{t.filters}</span>
              </div>

              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                />
                <span>{t.inStockOnly}</span>
              </label>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{t.maxPrice}</span>
                  <span className="text-teal-700">
                    {maxPrice} {t.egp}
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
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

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="text-xs font-bold text-slate-700">{t.location}</div>
                <button
                  type="button"
                  onClick={enableLocation}
                  disabled={isLocating}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-60"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? t.locating : t.useLocation}</span>
                </button>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                  {locationLabel ?? t.noLocation}
                </p>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3 space-y-5">
            <div className="bg-gradient-to-r from-teal-800 via-cyan-800 to-sky-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md shadow-cyan-900/10">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-200 text-xs font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>{t.researchBannerTitle}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-medium">{t.researchBannerSubtitle}</p>
              </div>
              <button
                onClick={triggerResearch}
                disabled={isResearching}
                className="bg-white hover:bg-cyan-50 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-2 border border-white/30"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-700 ${isResearching ? 'animate-spin' : ''}`} />
                <span>{isResearching ? t.researching : t.researchBtn}</span>
              </button>
            </div>

            {researchError && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2 text-xs font-semibold text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{researchError}</span>
              </div>
            )}

            {research && !isResearching && (
              <div className="bg-white border-2 border-cyan-300 rounded-2xl shadow-md overflow-hidden" aria-live="polite">
                <div className="bg-cyan-50/80 p-4 border-b border-cyan-100 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-cyan-700 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                      <RefreshCw className="w-3 h-3" /> {t.researchHeading}
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                      {t.unverified}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {research.results.length} {t.foundMedicines} · {research.radiusKm} km
                    </span>
                  </div>
                  {/* Verbatim server policy - the UI must not upgrade this to "verified". */}
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{research.sourcePolicy}</p>
                </div>

                {research.results.length === 0 ? (
                  <p className="p-5 text-xs font-semibold text-slate-500">{t.noResultsTitle}</p>
                ) : (
                  research.results.map((group) => (
                    <div key={group.medicineId}>
                      <div className="px-5 py-2 bg-slate-100/60 text-xs font-black text-slate-700">
                        {group.medicineName}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {group.offers.map((offer) => renderOfferRow(offer, false))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium space-y-0.5">
                <div>
                  {processedResults.length} {t.foundMedicines} {query ? `("${query}")` : ''}
                </div>
                {freshnessNote && <div className="text-[11px] text-slate-400">{freshnessNote}</div>}
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

            {aiAssist.status === 'matched' && (
              <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-violet-900 space-y-0.5">
                  <div className="font-black uppercase tracking-wider text-[10px]">{t.aiBadge}</div>
                  {aiAssist.interpretation && <p className="font-medium">{aiAssist.interpretation}</p>}
                </div>
              </div>
            )}

            {isSearching && (
              <div className="space-y-4 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="h-5 bg-slate-200 rounded-md w-1/3" />
                    <div className="h-4 bg-slate-100 rounded-md w-1/2" />
                    <div className="h-12 bg-slate-50 rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchError && (
              <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">{t.errorTitle}</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">{searchError}</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">{t.errorDesc}</p>
                <button
                  onClick={() => void runSearch()}
                  className="mt-1 inline-flex items-center gap-1.5 bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> {t.retry}
                </button>
              </div>
            )}

            {!isSearching && !searchError && processedResults.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <Pill className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">{t.noResultsTitle}</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">{t.noResultsDesc}</p>
                {(aiAssist.status === 'no_candidates' || aiAssist.status === 'error') && (
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {lang === 'ar'
                      ? 'تم فحص الاستعلام بمساعدة الذكاء الاصطناعي ولم يُعثر على تطابق في الكتالوج.'
                      : 'Claude also reviewed this query and found no confident catalog match.'}
                  </p>
                )}
              </div>
            )}

            {!isSearching &&
              !searchError &&
              processedResults.map(({ medicine, offers, cheapestPrice, pharmaciesCount }) => {
                const isExpanded = expandedCards[medicine.id] ?? true;

                return (
                  <div key={medicine.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black text-slate-900">
                            {isRTL ? medicine.arabicName : medicine.name}
                          </h2>
                          <span className="text-xs font-semibold text-slate-500" dir="auto">
                            ({isRTL ? medicine.name : medicine.arabicName})
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500">{medicine.activeIngredient}</p>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {medicine.strength && (
                            <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold border border-teal-200">
                              {medicine.strength}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 font-semibold">
                            {medicine.dosageForm}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 font-semibold">
                            {medicine.packSize}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0">
                        {cheapestPrice !== null ? (
                          <div className={isRTL ? 'text-left' : 'text-right'}>
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
                          <span>
                            {pharmaciesCount} {pharmaciesCount === 1 ? 'pharmacy' : 'pharmacies'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-2.5 bg-slate-100/50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>
                        {lang === 'ar' ? `عروض الصيدليات (${offers.length})` : `Pharmacy Offers (${offers.length})`}
                      </span>
                      <button
                        onClick={() => toggleExpand(medicine.id)}
                        className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 cursor-pointer font-bold"
                      >
                        {isExpanded ? (lang === 'ar' ? 'طي' : 'Collapse') : lang === 'ar' ? 'عرض' : 'Expand'}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="divide-y divide-slate-100">
                        {offers.map((offer) =>
                          renderOfferRow(offer, offer.available && offer.price === cheapestPrice)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </main>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}
