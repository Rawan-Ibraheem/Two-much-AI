import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { MOCK_MEDICINES } from '../data/mockMedicines';
import type { PharmacyOffer } from '../data/mockMedicines';

type SortOption = 'cheapest' | 'nearest' | 'freshest' | 'best_match';

interface ResearchVerifiedResult {
  normalizedName: string;
  normalizedArabicName: string;
  activeIngredient: string;
  gtin: string;
  verificationStatus: 'CONFIRMED_MATCH' | 'STALE' | 'AMBIGUOUS';
  lastChecked: string;
  offers: PharmacyOffer[];
}

export default function SearchResults() {
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('cheapest');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Research State
  const [isResearching, setIsResearching] = useState(false);
  const [researchStage, setResearchStage] = useState('');
  const [researchResult, setResearchResult] = useState<ResearchVerifiedResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q') || '';
    setQuery(qParam);
    setSearchInput(qParam);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const newUrl = `${window.location.pathname}?q=${encodeURIComponent(searchInput.trim())}`;
    window.history.pushState({}, '', newUrl);
    setQuery(searchInput.trim());
    setResearchResult(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Simulate Deep Research Mode
  const triggerResearch = () => {
    setIsResearching(true);
    setResearchResult(null);
    setResearchStage('Connecting to 4 Egyptian pharmacy scrapers...');

    setTimeout(() => {
      setResearchStage('Checking live inventory at El Ezaby, Roshdy, 19011...');
    }, 900);

    setTimeout(() => {
      setResearchStage('Normalizing medicine identity & strengths...');
    }, 1800);

    setTimeout(() => {
      setIsResearching(false);
      setResearchStage('');
      setResearchResult({
        normalizedName: query ? `${query.toUpperCase()} - Structured Match` : 'Panadol Extra Film-Coated 500/65mg',
        normalizedArabicName: 'بنادول إكسترا أقراص مطابقة معتمدة',
        activeIngredient: 'Paracetamol 500mg + Caffeine 65mg (Verified)',
        gtin: '6221123456789',
        verificationStatus: 'CONFIRMED_MATCH',
        lastChecked: 'Just now (Live verified)',
        offers: [
          {
            id: 'res-1',
            pharmacyName: 'El Ezaby Pharmacy (العزبي) - Live Scrape',
            branchName: 'Sidi Gaber Branch',
            price: 85,
            available: true,
            distanceKm: 1.1,
            lastChecked: 'Just now',
            url: 'https://elezabypharmacy.com',
            phone: '19600'
          },
          {
            id: 'res-2',
            pharmacyName: 'Roshdy Pharmacies (رشدي) - Live Scrape',
            branchName: 'Smouha Branch',
            price: 88,
            available: true,
            distanceKm: 2.3,
            lastChecked: 'Just now',
            url: 'https://roshdy.com',
            phone: '19661'
          },
          {
            id: 'res-3',
            pharmacyName: '19011 Pharmacies - Live Scrape',
            branchName: 'Camp Caesar Branch',
            price: 90,
            available: true,
            distanceKm: 3.5,
            lastChecked: 'Just now',
            url: 'https://19011.com',
            phone: '19011'
          }
        ]
      });
    }, 2700);
  };

  const getFreshnessMinutes = (label: string): number => {
    const normalized = label.toLowerCase().trim();

    if (!normalized || normalized.includes('just now')) return 0;
    if (normalized.includes('mins') || normalized.includes('min')) return Number.parseInt(normalized, 10) || 0;
    if (normalized.includes('hours') || normalized.includes('hour')) return (Number.parseInt(normalized, 10) || 0) * 60;

    return 0;
  };

  const getBestMatchScore = (item: (typeof MOCK_MEDICINES)[number], cleanQuery: string): number => {
    if (!cleanQuery) return 0;

    const query = cleanQuery.trim();
    const haystacks = [
      item.name,
      item.arabicName,
      item.activeIngredient,
      ...item.tags,
      item.strength,
      item.dosageForm,
    ].join(' ').toLowerCase();

    if (haystacks.includes(query)) return 100;
    if (item.name.toLowerCase().startsWith(query)) return 90;
    if (item.activeIngredient.toLowerCase().includes(query)) return 80;
    if (item.tags.some((tag) => tag.toLowerCase().includes(query))) return 70;

    return 0;
  };

  // Filter & Sort Logic
  const processedResults = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();

    const results = MOCK_MEDICINES.filter((item) => {
      if (!cleanQuery) return true;
      const matchEn = item.name.toLowerCase().includes(cleanQuery);
      const matchAr = item.arabicName.toLowerCase().includes(cleanQuery);
      const matchIng = item.activeIngredient.toLowerCase().includes(cleanQuery);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(cleanQuery));
      return matchEn || matchAr || matchIng || matchTags;
    })
      .map((item) => {
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

        const inStockOffers = filteredOffers.filter((o) => o.available);
        const cheapestPrice = inStockOffers.length > 0 ? Math.min(...inStockOffers.map((o) => o.price)) : null;

        return {
          medicine: item,
          offers: filteredOffers,
          cheapestPrice,
          pharmaciesCount: new Set(filteredOffers.map((o) => o.pharmacyName)).size,
          searchScore,
        };
      })
      .filter((result) => result.offers.length > 0 || !onlyAvailable);

    if (sortBy === 'best_match') {
      return results.sort((a, b) => getBestMatchScore(b.medicine, cleanQuery) - getBestMatchScore(a.medicine, cleanQuery));
    }

    return results;
  }, [query, sortBy, onlyAvailable, maxPrice, maxDistance]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div 
            onClick={() => { window.location.href = '/'; }}
            className="flex items-center gap-2 cursor-pointer font-black text-xl tracking-tight text-blue-700 shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              د
            </div>
            <span className="hidden sm:inline">DawaaFinder</span>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
            <div className="relative flex items-center">
              <input
                type="text"
                dir="auto"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search medicine brand or active ingredient..."
                className="w-full pl-10 pr-24 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>

          {/* Research Button in Header */}
          <button
            onClick={triggerResearch}
            disabled={isResearching}
            className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResearching ? 'animate-spin' : ''}`} />
            <span>Research Mode</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Filters */}
        <aside className="lg:col-span-1 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              Filters
            </div>

            <div>
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                Available in Stock Only
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Max Price</span>
                <span className="text-blue-600">{maxPrice} EGP</span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Max Distance</span>
                <span className="text-blue-600">{maxDistance} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </aside>

        {/* Results Stream */}
        <main className="lg:col-span-3 space-y-5">

          {/* Research Banner Callout */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                Fresh Pharmacy Verification
              </div>
              <p className="text-sm font-medium text-slate-100">
                Need guaranteed stock right now? Run a live branch scan across Egyptian pharmacies.
              </p>
            </div>
            <button
              onClick={triggerResearch}
              disabled={isResearching}
              className="bg-white hover:bg-slate-100 text-indigo-950 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isResearching ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`} />
              {isResearching ? 'Scanning...' : 'Research Now'}
            </button>
          </div>

          {/* Research Loading State */}
          {isResearching && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center space-y-3 animate-pulse">
              <div className="w-10 h-10 mx-auto rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="font-extrabold text-indigo-950 text-sm">Performing Deep Research Verification</h4>
                <p className="text-xs text-indigo-700 font-semibold mt-1">{researchStage}</p>
              </div>
            </div>
          )}

          {/* Verified Research Result Panel */}
          {researchResult && !isResearching && (
            <div className="bg-white border-2 border-indigo-500 rounded-2xl shadow-md overflow-hidden">
              <div className="bg-indigo-50/70 p-4 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Live Verified Result
                    </span>
                    <span className="text-xs font-semibold text-slate-500">GTIN: {researchResult.gtin}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    {researchResult.normalizedName}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium" dir="rtl">
                    {researchResult.normalizedArabicName} • {researchResult.activeIngredient}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" /> {researchResult.verificationStatus}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400 mt-1">
                    Checked {researchResult.lastChecked}
                  </div>
                </div>
              </div>

              {/* Research Offers List */}
              <div className="divide-y divide-slate-100">
                {researchResult.offers.map((offer) => (
                  <div key={offer.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{offer.pharmacyName}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {offer.branchName} ({offer.distanceKm} km)</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {offer.lastChecked}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" /> In Stock
                        </span>
                        <div className="text-base font-black text-slate-900">
                          {offer.price} <span className="text-xs font-semibold text-slate-500">EGP</span>
                        </div>
                      </div>

                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition"
                      >
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard Controls: Sort Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Cached results for <strong className="text-slate-800 font-semibold">{query ? `"${query}"` : 'All Products'}</strong>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs font-bold text-blue-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="cheapest">Cheapest</option>
                <option value="nearest">Nearest</option>
                <option value="freshest">Freshest</option>
                <option value="best_match">Best Match</option>
              </select>
            </div>
          </div>

          {/* Standard Product Cards */}
          {processedResults.map(({ medicine, offers, cheapestPrice, pharmaciesCount }) => {
            const isExpanded = expandedCards[medicine.id] ?? true;

            return (
              <div 
                key={medicine.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{medicine.name}</h2>
                      <span className="text-sm font-semibold text-slate-500" dir="rtl">
                        {medicine.arabicName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                        {medicine.strength}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {medicine.dosageForm}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {medicine.packSize}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0">
                    {cheapestPrice !== null ? (
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Cheapest Available
                        </span>
                        <div className="text-2xl font-black text-slate-900 mt-0.5">
                          {cheapestPrice} <span className="text-xs font-bold text-slate-500">EGP</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        Unavailable
                      </span>
                    )}

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {pharmaciesCount} {pharmaciesCount === 1 ? 'pharmacy' : 'pharmacies'} found
                    </div>
                  </div>
                </div>

                <div className="px-5 py-2.5 bg-slate-100/50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Pharmacy Offers ({offers.length})</span>
                  <button 
                    onClick={() => toggleExpand(medicine.id)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 cursor-pointer font-semibold"
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

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
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{offer.pharmacyName}</span>
                              {isCheapestOffer && (
                                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Best Deal
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {offer.branchName} ({offer.distanceKm} km)
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {offer.lastChecked}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-5">
                            <div className="text-right">
                              <div className="text-xs font-bold mb-0.5">
                                {offer.available ? (
                                  <span className="text-emerald-600 flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center justify-end gap-1">
                                    <XCircle className="w-3.5 h-3.5" /> Out of Stock
                                  </span>
                                )}
                              </div>
                              <div className="text-lg font-black text-slate-900">
                                {offer.price} <span className="text-xs font-semibold text-slate-500">EGP</span>
                              </div>
                            </div>

                            <a
                              href={offer.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold px-3 py-1.5 rounded-xl text-xs transition shadow-2xs"
                            >
                              <span>Visit</span>
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
    </div>
  );
}