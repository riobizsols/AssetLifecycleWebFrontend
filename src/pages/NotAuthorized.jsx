import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldOff,
  LayoutDashboard,
  ArrowLeft,
  UserCog,
  HelpCircle,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigationStore } from '../store/useNavigationStore';
import { getAppPath } from '../utils/appIdToPath';

const BRAND = '#0E2F4B';
const BRAND_LIGHT = '#1a4a6e';

function formatPathLabel(path) {
  if (!path || path === '/') return '';
  return path
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .join(' / ');
}

function flattenNavLinks(items, limit = 4) {
  const out = [];
  const seen = new Set();
  const walk = (nodes) => {
    if (!nodes?.length || out.length >= limit) return;
    for (const node of nodes) {
      if (out.length >= limit) break;
      if (!node.is_group && node.app_id) {
        const route = getAppPath(node.app_id);
        if (route && !seen.has(route)) {
          seen.add(route);
          out.push({ label: node.label, route });
        }
      }
      if (node.children?.length) walk(node.children);
    }
  };
  walk(items);
  return out;
}

export default function NotAuthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const navigation = useNavigationStore((s) => s.navigation);

  const fromPath = location.state?.from;
  const pageLabel = formatPathLabel(fromPath);

  const quickLinks = useMemo(() => {
    const links = flattenNavLinks(navigation, 4).filter(
      (item) => item.route && item.route !== fromPath,
    );
    return links;
  }, [navigation, fromPath]);

  const goDashboard = () => navigate('/dashboard', { replace: true });

  const goBackSafe = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      goDashboard();
    }
  };

  return (
    <div className="not-authorized-page flex min-h-screen min-h-dvh w-full">
      <div className="flex w-full min-h-screen min-h-dvh flex-col overflow-hidden bg-white lg:flex-row">
        {/* Brand panel */}
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden px-8 py-12 lg:w-[42%] lg:min-h-full lg:py-16"
          style={{ background: `linear-gradient(145deg, ${BRAND} 0%, ${BRAND_LIGHT} 55%, #0a2438 100%)` }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
            <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full border-[3px] border-white" />
            <div className="absolute -bottom-20 -right-10 h-80 w-80 rounded-full border-[3px] border-white" />
            <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full border border-white" />
          </div>

          <p
            className="pointer-events-none absolute right-6 top-4 select-none text-[7rem] font-black leading-none text-white/5 lg:text-[9rem]"
            aria-hidden
          >
            403
          </p>

          <div className="relative z-10 flex flex-col items-center text-center text-white">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
              <div className="relative">
                <ShieldOff className="h-12 w-12 text-white" strokeWidth={1.5} aria-hidden />
                <Lock
                  className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-400 p-0.5 text-[#0E2F4B]"
                  aria-hidden
                />
              </div>
            </div>
            <img
              src="/logo.png"
              alt=""
              className="mb-8 h-10 w-auto brightness-0 invert opacity-90"
            />
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/60">
              {t('notAuthorized.errorCode')}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight lg:text-4xl">
              {t('notAuthorized.title')}
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/75">
              {t('notAuthorized.subtitle')}
            </p>
          </div>
        </div>

        {/* Content panel */}
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-12">
          <div className="mx-auto w-full max-w-xl">
            {pageLabel ? (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 px-4 py-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <HelpCircle className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">
                    {t('notAuthorized.requestedPage')}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-amber-950">
                    {pageLabel}
                  </p>
                  {fromPath ? (
                    <p className="mt-1 truncate font-mono text-xs text-amber-700/70">{fromPath}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <p className="text-base leading-relaxed text-gray-600">
              {t('notAuthorized.description')}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  <UserCog className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-sm leading-snug text-gray-600">{t('notAuthorized.hintRole')}</p>
              </div>
              <div className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                  <HelpCircle className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-sm leading-snug text-gray-600">{t('notAuthorized.hintAdmin')}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goDashboard}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: BRAND }}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                {t('notAuthorized.goToDashboard')}
              </button>
              <button
                type="button"
                onClick={goBackSafe}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t('notAuthorized.goBack')}
              </button>
            </div>

            {quickLinks.length > 0 ? (
              <div className="mt-10 border-t border-gray-100 pt-8">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t('notAuthorized.quickLinks')}
                </p>
                <ul className="space-y-1">
                  {quickLinks.map((link) => (
                    <li key={link.route}>
                      <button
                        type="button"
                        onClick={() => navigate(link.route)}
                        className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-[#0E2F4B]/5 hover:text-[#0E2F4B]"
                      >
                        <span>{link.label}</span>
                        <ChevronRight
                          className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0E2F4B]"
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-8 text-center text-xs text-gray-400 sm:text-left">
              {t('notAuthorized.contactAdmin')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
