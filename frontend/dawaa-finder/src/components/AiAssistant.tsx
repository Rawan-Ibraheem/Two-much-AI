/**
 * AI Health Assistant panel for `POST /api/assistant/recommend`.
 *
 * Presentation only. The backend decides the status, the interpreted symptoms,
 * which medicines are options, which pharmacy offers exist and the exact
 * wording of the urgent/needs-more-information message and the disclaimer -
 * this component renders those values verbatim and never derives, filters or
 * supplements them.
 */
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, Pill, Sparkles, XCircle } from 'lucide-react';
import { askAssistant } from '../services/api';
import type { AssistantResponse, MedicineProduct, UserLocation } from '../services/api';

const COPY = {
  en: {
    title: 'AI Health Assistant',
    subtitle: 'Describe your symptoms and get possible medicines to discuss with a pharmacist.',
    placeholder: 'e.g. I have a headache and fever',
    submit: 'Ask Assistant',
    asking: 'Analyzing symptoms...',
    urgentBadge: 'Urgent',
    moreInfoBadge: 'More detail needed',
    interpreted: 'Interpreted symptoms',
    options: 'Possible medicine options',
    availability: 'Pharmacy availability',
    noOffers: 'No current pharmacy availability was found.',
    inStock: 'In stock',
    outOfStock: 'Out of stock',
    egp: 'EGP',
    away: 'away',
    errorTitle: 'Could not reach the assistant',
    errorMessage: "Couldn't reach the assistant. Please try again.",
    retry: 'Try again',
    emptyState: 'Enter a symptom description to see possible options to discuss with a pharmacist.',
    emptyMessage: 'Please describe your symptoms before asking the assistant.'
  },
  ar: {
    title: 'المساعد الصحي الذكي',
    subtitle: 'اوصف أعراضك واحصل على أدوية محتملة لمناقشتها مع الصيدلي.',
    placeholder: 'مثال: عندي سخونية وصداع',
    submit: 'اسأل المساعد',
    asking: 'جارٍ تحليل الأعراض...',
    urgentBadge: 'حالة عاجلة',
    moreInfoBadge: 'نحتاج تفاصيل أكثر',
    interpreted: 'الأعراض المفهومة',
    options: 'أدوية محتملة',
    availability: 'التوفر في الصيدليات',
    noOffers: 'لم يتم العثور على توفر حالي لهذا الدواء.',
    inStock: 'متوفر',
    outOfStock: 'غير متوفر',
    egp: 'ج.م',
    away: 'منك',
    errorTitle: 'تعذّر الوصول إلى المساعد',
    errorMessage: 'تعذّر الوصول إلى المساعد. حاول مرة أخرى.',
    retry: 'حاول مرة أخرى',
    emptyState: 'اكتب وصفاً لأعراضك لرؤية أدوية محتملة لمناقشتها مع الصيدلي.',
    emptyMessage: 'من فضلك اوصف أعراضك قبل سؤال المساعد.'
  }
};

export default function AiAssistant({
  lang,
  location
}: {
  lang: 'en' | 'ar';
  location: UserLocation | null;
}) {
  const c = COPY[lang];
  const isRTL = lang === 'ar';

  const [message, setMessage] = useState('');
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setValidationError(true);
      return;
    }
    if (isAsking) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setIsAsking(true);
    setError(null);
    setValidationError(false);
    setResult(null);
    try {
      setResult(await askAssistant({ message: trimmed, location, signal: controller.signal }));
    } catch (caught) {
      if ((caught as Error).name === 'AbortError') return;
      setError(c.errorMessage);
    } finally {
      if (!controller.signal.aborted) setIsAsking(false);
    }
  };

  const retry = () => {
    void ask({ preventDefault: () => undefined } as FormEvent);
  };

  const renderOffers = (product: MedicineProduct | undefined) => {
    if (!product || product.offers.length === 0) {
      return <p className="px-4 py-3 text-[11px] font-semibold text-slate-400">{c.noOffers}</p>;
    }

    return (
      <div className="divide-y divide-slate-100">
        {product.offers.map((offer) => (
          <div
            key={offer.id}
            className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-slate-900">{offer.pharmacyName}</div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>
                  {offer.branchName}
                  {offer.city ? `, ${offer.city}` : ''} ({offer.distanceKm} km {c.away})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {offer.available ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {c.inStock}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                  <XCircle className="w-3.5 h-3.5" /> {c.outOfStock}
                </span>
              )}
              <span className="text-sm font-black text-slate-900">
                {offer.price} <span className="text-[10px] font-semibold text-slate-500">{offer.currency || c.egp}</span>
              </span>
            </div>
            <div className="w-full text-[11px] font-medium text-slate-500">
              {offer.lastChecked}
              {offer.url && (
                <a href={offer.url} target="_blank" rel="noreferrer" className="ml-3 font-bold text-teal-700 underline underline-offset-2">
                  View pharmacy
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section
      className={`bg-white rounded-2xl border border-teal-100 shadow-[0_16px_35px_rgba(13,148,136,0.08)] p-5 sm:p-6 space-y-4 ${
        isRTL ? 'text-right' : 'text-left'
      }`}
      aria-labelledby="ai-assistant-heading"
    >
      <div className="space-y-1">
        <h2
          id="ai-assistant-heading"
          className="flex items-center gap-2 text-base font-extrabold text-slate-900"
        >
          <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-sm shadow-teal-200/80">
            <Sparkles className="w-4 h-4" />
          </span>
          {c.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{c.subtitle}</p>
      </div>

      <form onSubmit={ask} className="space-y-3">
        <label htmlFor="assistant-symptoms" className="sr-only">
          {c.subtitle}
        </label>
        <textarea
          id="assistant-symptoms"
          dir="auto"
          rows={3}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (e.target.value.trim()) setValidationError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void ask(e as unknown as FormEvent);
            }
          }}
          placeholder={c.placeholder}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 resize-y focus:bg-white focus:ring-4 focus:ring-teal-100 focus:border-teal-300 outline-none transition shadow-sm"
        />
        {validationError && (
          <p role="alert" className="text-xs font-semibold text-rose-600">{c.emptyMessage}</p>
        )}
        <button
          type="submit"
          disabled={isAsking || !message.trim()}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <Sparkles className={`w-4 h-4 ${isAsking ? 'animate-spin' : ''}`} />
          {isAsking ? c.asking : c.submit}
        </button>
      </form>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-2 text-xs font-semibold text-rose-900">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-black uppercase tracking-wider text-[10px]">{c.errorTitle}</div>
            <p className="font-medium">{error}</p>
            <button type="button" onClick={retry} className="pt-1 font-bold text-rose-700 underline underline-offset-2">
              {c.retry}
            </button>
          </div>
        </div>
      )}

      {!result && !error && !isAsking && (
        <p className="rounded-xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-3 text-xs font-medium leading-relaxed text-teal-800">
          {c.emptyState}
        </p>
      )}

      {/* Urgent: the backend's warning replaces the recommendations entirely. */}
      {result?.status === 'urgent' && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-5 flex items-start gap-3 shadow-sm"
        >
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
              {c.urgentBadge}
            </div>
            <p className="text-sm font-bold text-rose-900 leading-relaxed">{result.message}</p>
          </div>
        </div>
      )}

      {result?.status === 'needs_more_information' && (
        <div
          aria-live="polite"
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-amber-900">
            <div className="font-black uppercase tracking-wider text-[10px]">{c.moreInfoBadge}</div>
            <p className="text-xs font-semibold">{result.message}</p>
          </div>
        </div>
      )}

      {result?.status === 'ok' && (
        <div className="space-y-4" aria-live="polite">
          {result.interpretedSymptoms.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {c.interpreted}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.interpretedSymptoms.map((symptom) => (
                  <span
                    key={symptom}
                    className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {c.options}
            </div>

            {result.recommendations.map((recommendation) => {
              const product = result.pharmacyResults.find(
                (candidate) => candidate.id === recommendation.medicineId
              );

              return (
                <div
                  key={recommendation.medicineId}
                  className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                >
                  <div className="p-4 bg-slate-50/60 border-b border-slate-100 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="text-sm font-black text-slate-900">
                        {recommendation.medicineName}
                      </span>
                      {product?.strength && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[11px] font-bold border border-teal-200">
                          {product.strength}
                        </span>
                      )}
                      {product?.dosageForm && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-700 text-[11px] font-semibold">
                          {product.dosageForm}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600">{recommendation.reason}</p>
                  </div>

                  <div className="px-4 py-2 bg-slate-100/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600">
                    {c.availability}
                  </div>
                  {renderOffers(product)}
                </div>
              );
            })}
          </div>

          {/* Verbatim backend disclaimer - never reworded or replaced here. */}
          {result.disclaimer && (
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
              {result.disclaimer}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
