import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import API from '../../lib/axios';

const STEPS = [
  { id: 1, label: 'Identify' },
  { id: 2, label: 'Confirm' },
  { id: 3, label: 'Warning' },
  { id: 4, label: 'Verify' },
  { id: 5, label: 'Delete' },
];

const DATA_DELETED = [
  'Organization',
  'Departments',
  'Branches',
  'Users',
  'Assets',
  'Asset History',
  'Tickets',
  'Notifications',
  'Files',
  'Settings',
  'Audit Records (if applicable)',
];

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function Stepper({ current }) {
  return (
    <nav aria-label="Deletion progress" className="mb-8">
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((step, index) => {
          const done = current > step.id;
          const active = current === step.id;
          return (
            <li key={step.id} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center w-full">
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-semibold border-2 transition-colors ${
                    done
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : active
                        ? 'bg-[#0E2F4B] border-[#0E2F4B] text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <CheckCircle2 size={16} /> : step.id}
                </div>
                <span
                  className={`mt-1.5 text-[10px] sm:text-xs font-medium truncate max-w-full ${
                    active ? 'text-[#0E2F4B]' : done ? 'text-emerald-700' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <ChevronRight
                  className={`hidden sm:block shrink-0 mx-0.5 ${
                    done ? 'text-emerald-500' : 'text-gray-300'
                  }`}
                  size={16}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function DangerBanner({ children }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <AlertTriangle className="shrink-0 text-red-600 mt-0.5" size={18} />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DeletionProgressPanel({ progress, failed }) {
  const percent = Math.max(0, Math.min(100, Number(progress?.progressPercent) || 0));
  const stages = Array.isArray(progress?.stages) ? progress.stages : [];
  const barColor = failed ? 'bg-red-600' : percent >= 100 ? 'bg-emerald-600' : 'bg-[#0E2F4B]';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Deletion progress
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {failed
                ? 'Organization deletion failed'
                : progress?.progressMessage || 'Deleting organization…'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-bold tabular-nums ${failed ? 'text-red-700' : 'text-[#0E2F4B]'}`}>
              {percent}%
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Elapsed {formatElapsed(progress?.elapsedMs)}
            </p>
          </div>
        </div>

        <div
          className="h-3 w-full rounded-full bg-slate-200 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Organization deletion progress"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${barColor} ${
              !failed && percent < 100 ? 'relative overflow-hidden' : ''
            }`}
            style={{ width: `${percent}%` }}
          >
            {!failed && percent > 0 && percent < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_1.8s_infinite]" />
            )}
          </div>
        </div>

        {stages.length > 0 && (
          <ol className="space-y-2.5 pt-1">
            {stages.map((stage) => {
              const isFailedStage = failed && stage.active;
              return (
                <li key={stage.key} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      stage.done
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : isFailedStage
                          ? 'border-red-600 bg-red-600 text-white'
                          : stage.active
                            ? 'border-[#0E2F4B] bg-white text-[#0E2F4B]'
                            : 'border-slate-300 bg-white text-slate-300'
                    }`}
                  >
                    {stage.done ? (
                      <CheckCircle2 size={14} />
                    ) : isFailedStage ? (
                      <XCircle size={14} />
                    ) : stage.active ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={
                      stage.done
                        ? 'text-emerald-800 font-medium'
                        : isFailedStage
                          ? 'text-red-800 font-semibold'
                          : stage.active
                            ? 'text-slate-900 font-semibold'
                            : 'text-slate-400'
                    }
                  >
                    {stage.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {!failed && percent < 100 && (
        <p className="text-xs text-slate-500 text-center">
          Large organizations can take several minutes. Keep this page open until the process finishes.
        </p>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function OtpInputs({ value, onChange, disabled }) {
  const digits = useMemo(() => {
    const chars = String(value || '').padEnd(6, ' ').slice(0, 6).split('');
    return chars.map((c) => (c === ' ' ? '' : c));
  }, [value]);
  const refs = useRef([]);

  const setDigit = (index, char) => {
    const next = [...digits];
    next[index] = char.replace(/\D/g, '').slice(-1);
    onChange(next.join(''));
    if (char && index < 5) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const onPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={onPaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={digit}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="h-12 w-10 sm:h-14 sm:w-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] disabled:bg-gray-100"
        />
      ))}
    </div>
  );
}

export default function DeleteAccount() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  const [session, setSession] = useState({
    requestId: '',
    confirmationToken: '',
    organizationName: '',
    subdomain: '',
    maskedEmail: '',
    orgId: '',
    dbName: '',
    confirmationPhrase: '',
    identifierType: 'subdomain',
    showEmail: false,
    displayEmail: '',
    otpVerified: false,
  });
  const [deletionProgress, setDeletionProgress] = useState(null);
  const [deletionFailed, setDeletionFailed] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const t = setInterval(() => setResendSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSeconds]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applyProgressPayload = useCallback(
    (payload) => {
      setDeletionProgress(payload);
      if (payload?.status === 'completed') {
        stopPolling();
        setDeletionFailed(false);
        setStep(7);
        return true;
      }
      if (payload?.status === 'failed') {
        stopPolling();
        setDeletionFailed(true);
        setError(
          payload.errorMessage ||
            'Organization deletion failed. The tenant may still exist — contact support.',
        );
        return true;
      }
      return false;
    },
    [stopPolling],
  );

  const pollDeletionStatus = useCallback(async () => {
    if (!session.requestId || !session.confirmationToken) return;
    try {
      const res = await API.post(
        '/account-deletion/status',
        {
          requestId: session.requestId,
          confirmationToken: session.confirmationToken,
        },
        { skipAuthRedirect: true },
      );
      applyProgressPayload(res.data);
    } catch (err) {
      // Keep polling on transient errors; surface persistent failures from status payload
      if (err.response?.status === 410 || err.response?.status === 404) {
        stopPolling();
        setDeletionFailed(true);
        setError(err.response?.data?.message || 'Unable to track deletion status.');
      }
    }
  }, [session.requestId, session.confirmationToken, applyProgressPayload, stopPolling]);

  const apiBody = useCallback(
    (extra = {}) => ({
      requestId: session.requestId,
      confirmationToken: session.confirmationToken,
      ...extra,
    }),
    [session.requestId, session.confirmationToken],
  );

  const handleLookup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/account-deletion/lookup', { identifier }, { skipAuthRedirect: true });
      setSession({
        requestId: res.data.requestId,
        confirmationToken: res.data.confirmationToken,
        organizationName: res.data.organizationName,
        subdomain: res.data.subdomain,
        maskedEmail: res.data.maskedEmail,
        orgId: res.data.orgId,
        dbName: '',
        confirmationPhrase: res.data.confirmationPhrase || '',
        identifierType: res.data.identifierType || 'subdomain',
        showEmail: Boolean(res.data.showEmail),
        displayEmail: res.data.displayEmail || '',
        otpVerified: false,
      });
      setConfirmationText('');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Organization not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatement = async (e) => {
    e.preventDefault();
    setError('');
    // Exact match — do not trim
    if (confirmationText !== session.confirmationPhrase) {
      setError(
        'Confirmation text does not match. Type your organization subdomain and name exactly as shown.',
      );
      return;
    }
    setLoading(true);
    try {
      await API.post(
        '/account-deletion/confirm-statement',
        apiBody({ confirmationText }),
        { skipAuthRedirect: true },
      );
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Confirmation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    setError('');
    setLoading(true);
    try {
      await API.post('/account-deletion/acknowledge-warning', apiBody(), {
        skipAuthRedirect: true,
      });
      const otpRes = await API.post('/account-deletion/send-otp', apiBody(), {
        skipAuthRedirect: true,
      });
      setResendSeconds(otpRes.data?.resendAvailableIn || 60);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to continue.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0) return;
    setError('');
    setLoading(true);
    try {
      const otpRes = await API.post('/account-deletion/send-otp', apiBody(), {
        skipAuthRedirect: true,
      });
      setResendSeconds(otpRes.data?.resendAvailableIn || 60);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
      if (err.response?.data?.retryAfter) {
        setResendSeconds(err.response.data.retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post(
        '/account-deletion/verify-otp',
        apiBody({ otp }),
        { skipAuthRedirect: true },
      );
      setSession((prev) => ({
        ...prev,
        otpVerified: true,
        dbName: res.data.dbName || prev.dbName,
        organizationName: res.data.organizationName || prev.organizationName,
        subdomain: res.data.subdomain || prev.subdomain,
        maskedEmail: res.data.registeredEmail || prev.maskedEmail,
      }));
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!session.otpVerified) return;
    setError('');
    setDeletionFailed(false);
    setLoading(true);
    setDeletionProgress({
      status: 'deleting',
      progressPercent: 1,
      progressMessage: 'Starting organization deletion…',
      elapsedMs: 0,
      stages: [],
    });
    setStep(6);
    try {
      const res = await API.post('/account-deletion/execute', apiBody(), {
        skipAuthRedirect: true,
        timeout: 60000,
      });
      const terminal = applyProgressPayload(res.data);
      if (!terminal) {
        stopPolling();
        pollRef.current = setInterval(pollDeletionStatus, 1200);
        // Immediate first poll in case job already advanced
        pollDeletionStatus();
      }
    } catch (err) {
      setDeletionFailed(true);
      setError(err.response?.data?.message || 'Deletion failed. Please contact support.');
      stopPolling();
    } finally {
      setLoading(false);
    }
  };

  const statementValid = confirmationText === session.confirmationPhrase;
  const stepperStep = step >= 6 ? 5 : step;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <header className="border-b border-slate-200 bg-[#0E2F4B] text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ALM" className="h-9 w-auto brightness-0 invert" />
            <span className="text-sm font-medium tracking-wide opacity-90">Account Deletion</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-white/80 hover:text-white underline-offset-2 hover:underline"
          >
            Back to login
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-5 py-4 sm:px-8">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-700">
                <Trash2 size={20} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                  Delete Organization Account
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Permanent tenant deletion for your organization. This is not for removing a single employee.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {step <= 5 && <Stepper current={stepperStep} />}

            {error && step !== 6 && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {error}
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleLookup} className="space-y-6">
                <DangerBanner>
                  <p className="font-semibold">Deleting your organization is permanent.</p>
                  <p>This action cannot be undone.</p>
                </DangerBanner>

                <div>
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    The following data will be permanently deleted:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-slate-600">
                    {DATA_DELETED.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label htmlFor="identifier" className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Organization subdomain or email
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="organization"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. acme  or  admin@acme.com"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Enter your organization subdomain or the organization admin email. Lookup uses the tenants registry only.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="w-full sm:w-auto min-h-[48px] px-6 rounded-lg bg-[#0E2F4B] text-white font-semibold hover:bg-[#143d65] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Continue
                </button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form onSubmit={handleStatement} className="space-y-6">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                  <p className="font-semibold text-base mb-2 flex items-center gap-2">
                    <ShieldAlert size={18} /> Confirmation required
                  </p>
                  <p>
                    Deleting <strong>{session.organizationName}</strong>
                    {session.subdomain ? ` (${session.subdomain})` : ''} permanently removes all
                    company data — including all users, departments, assets, documents, and
                    maintenance records — and cannot be recovered.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    Please type your organization subdomain and organization name exactly:
                  </p>
                  <p className="text-xs text-slate-500 mb-2">
                    Format: <code className="bg-slate-100 px-1 rounded">subdomain organization name</code>
                    {' '}(one space between them)
                  </p>
                  <code className="block rounded-lg bg-slate-900 text-amber-300 px-4 py-3 text-sm sm:text-base font-mono select-all break-all">
                    {session.confirmationPhrase}
                  </code>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    className={`mt-3 w-full rounded-lg border px-4 py-3 font-mono text-sm sm:text-base focus:outline-none focus:ring-2 ${
                      confirmationText && !statementValid
                        ? 'border-red-400 focus:ring-red-400'
                        : statementValid
                          ? 'border-emerald-400 focus:ring-emerald-500'
                          : 'border-slate-300 focus:ring-[#0E2F4B]'
                    }`}
                    placeholder="Type subdomain and organization name"
                    aria-label="Type organization subdomain and name"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Case-sensitive. Do not add or remove spaces. Example pattern matches the text shown above.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError('');
                    }}
                    className="min-h-[48px] px-5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !statementValid}
                    className="min-h-[48px] flex-1 px-6 rounded-lg bg-[#0E2F4B] text-white font-semibold hover:bg-[#143d65] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                    Continue
                  </button>
                </div>
              </form>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="rounded-xl border-2 border-red-300 bg-red-50 px-5 py-5">
                  <h2 className="text-lg sm:text-xl font-bold text-red-900 mb-2">
                    Are you absolutely sure?
                  </h2>
                  <p className="text-sm text-red-800 mb-4">This action cannot be undone.</p>
                  <p className="text-sm font-medium text-red-900 mb-2">Once deleted:</p>
                  <ul className="space-y-2 text-sm text-red-900">
                    {[
                      'Organization will no longer exist',
                      'All users lose access',
                      'All assets are removed',
                      'Database is permanently deleted',
                      'Recovery is impossible',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="shrink-0 text-red-600 mt-0.5" size={16} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="min-h-[48px] px-5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    disabled={loading}
                    className="min-h-[48px] flex-1 px-6 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">Enter verification code</h2>
                  <p className="text-sm text-slate-600">
                    {session.showEmail && session.displayEmail ? (
                      <>
                        We sent a 6-digit code to <strong>{session.displayEmail}</strong>. It expires
                        in 10 minutes.
                      </>
                    ) : (
                      <>
                        We sent a 6-digit code to the organization&apos;s registered email. It expires
                        in 10 minutes.
                      </>
                    )}
                  </p>
                </div>

                <OtpInputs value={otp} onChange={setOtp} disabled={loading} />

                <div className="text-center text-sm text-slate-600">
                  {resendSeconds > 0 ? (
                    <span>Resend available in {resendSeconds}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-[#0E2F4B] font-medium hover:underline disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.replace(/\D/g, '').length !== 6}
                  className="w-full min-h-[48px] rounded-lg bg-[#0E2F4B] text-white font-semibold hover:bg-[#143d65] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  Verify
                </button>
              </form>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-900">Final Confirmation</h2>
                <p className="text-sm text-slate-600">You are deleting:</p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
                  {[
                    { label: 'Organization Name', value: session.organizationName, icon: Building2 },
                    { label: 'Subdomain', value: session.subdomain || '—' },
                    ...(session.showEmail
                      ? [{ label: 'Registered Email', value: session.displayEmail || session.maskedEmail }]
                      : []),
                    { label: 'Database Name', value: session.dbName || '—' },
                  ].map((row) => (
                    <div key={row.label} className="flex flex-col sm:flex-row sm:items-center gap-1 px-4 py-3">
                      <span className="text-xs uppercase tracking-wide text-slate-500 sm:w-40 shrink-0">
                        {row.label}
                      </span>
                      <span className="text-sm font-medium text-slate-900 break-all">{row.value}</span>
                    </div>
                  ))}
                </div>

                <DangerBanner>
                  <p className="font-semibold">This permanently deletes the organization database.</p>
                  <p>There is no undo and no backup restore from this action.</p>
                </DangerBanner>

                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={loading || !session.otpVerified}
                  className="w-full min-h-[52px] rounded-lg bg-red-700 text-white text-base font-bold hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  Delete Organization Permanently
                </button>
              </div>
            )}

            {/* Step 6 — live deletion progress / failure */}
            {step === 6 && (
              <div className="space-y-6 animate-in fade-in">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {deletionFailed ? 'Deletion Failed' : 'Deleting Organization'}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {deletionFailed
                      ? 'The deletion process stopped before completion.'
                      : `Removing ${session.organizationName || 'your organization'} and all associated data.`}
                  </p>
                </div>

                <DeletionProgressPanel progress={deletionProgress} failed={deletionFailed} />

                {deletionFailed && (
                  <div className="space-y-4">
                    <div
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                      role="alert"
                    >
                      <p className="font-semibold mb-1">Deletion failed</p>
                      <p>
                        {error ||
                          deletionProgress?.errorMessage ||
                          'Organization deletion failed. Please contact support.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="w-full min-h-[48px] rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                    >
                      Back to login
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 7 — success */}
            {step === 7 && (
              <div className="text-center py-6 sm:py-10 space-y-4 animate-in fade-in">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">Organization Deleted</h2>
                <p className="text-slate-600 max-w-md mx-auto">
                  Your organization has been permanently removed.
                  <br />
                  All associated data has been deleted.
                </p>
                {deletionProgress?.elapsedMs != null && (
                  <p className="text-sm text-slate-500">
                    Completed in {formatElapsed(deletionProgress.elapsedMs)}
                  </p>
                )}
                <p className="text-sm text-slate-500">
                  A confirmation email has been sent to the organization admin email.
                </p>
                <p className="text-sm text-slate-500">Thank you for using ALM.</p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 px-4">
          Need help? Contact your ALM administrator or support before deleting production data.
        </p>
      </main>
    </div>
  );
}
