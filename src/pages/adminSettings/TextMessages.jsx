import React, { useEffect, useMemo, useState } from "react";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";

export default function TextMessages() {
  const [langCode, setLangCode] = useState("ch");
  const suggestedLangs = useMemo(
    () => [
      { code: "ch", label: "Chinese" },
      { code: "de", label: "German" },
      { code: "ta", label: "Tamil" },
      { code: "hi", label: "Hindi" },
      { code: "fr", label: "French" },
      { code: "es", label: "Spanish" },
    ],
    [],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState([]); // [{tmd_id, text}]
  const [translations, setTranslations] = useState({}); // { [tmd_id]: text }
  const [dirty, setDirty] = useState({}); // { [tmd_id]: true }
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const dRes = await API.get("/text-messages/default");

        if (cancelled) return;

        const d = Array.isArray(dRes.data?.data) ? dRes.data.data : [];

        setDefaults(d);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load text messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const code = String(langCode || "").trim().toLowerCase();
        if (!code) {
          setTranslations({});
          setDirty({});
          return;
        }

        const tRes = await API.get(`/text-messages/translations/${code}`);
        if (cancelled) return;
        const trRows = Array.isArray(tRes.data?.data) ? tRes.data.data : [];

        const trMap = {};
        for (const row of trRows) {
          if (row?.tmd_id) trMap[row.tmd_id] = row.text ?? "";
        }

        setTranslations(trMap);
        setDirty({});
      } catch (e) {
        console.error(e);
        toast.error("Failed to load translations");
        setTranslations({});
        setDirty({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [langCode]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return defaults;
    return defaults.filter((r) => {
      const en = String(r.text || "").toLowerCase();
      const id = String(r.tmd_id || "").toLowerCase();
      const zh = String(translations[r.tmd_id] || "").toLowerCase();
      return en.includes(q) || id.includes(q) || zh.includes(q);
    });
  }, [defaults, filter, translations]);

  const onChangeTranslation = (tmdId, value) => {
    setTranslations((prev) => ({ ...prev, [tmdId]: value }));
    setDirty((prev) => ({ ...prev, [tmdId]: true }));
  };

  const saveAll = async () => {
    const keys = Object.keys(dirty);
    if (keys.length === 0) {
      toast("No changes to save");
      return;
    }

    try {
      setSaving(true);
      const code = String(langCode || "").trim().toLowerCase();
      if (!code) {
        toast.error("Please enter a lang code");
        return;
      }
      const payload = {
        translations: keys.map((tmd_id) => ({
          tmd_id,
          text: translations[tmd_id] ?? "",
        })),
      };

      await API.put(`/text-messages/translations/${code}`, payload);
      toast.success("Saved");
      setDirty({});
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#0E2F4B]">
            Text Messages (English → Other Language)
          </h2>
          <p className="text-sm text-gray-600">
            Lang code: <span className="font-mono">{String(langCode || "").trim().toLowerCase()}</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={String(langCode || "").trim().toLowerCase()}
            onChange={(e) => setLangCode(e.target.value)}
            className="h-9 px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
            title="Select a language code"
          >
            {suggestedLangs.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} ({l.code})
              </option>
            ))}
            <option value="">Custom...</option>
          </select>
          <input
            value={langCode}
            onChange={(e) => setLangCode(e.target.value)}
            placeholder="lang code (e.g., ch)"
            className="h-9 w-36 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search..."
            className="h-9 w-64 max-w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
          />
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || loading}
            className="h-9 px-4 rounded bg-[#0E2F4B] text-white text-sm font-semibold hover:bg-[#14395c] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="py-10 text-center text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto" />
            <div className="mt-3">Loading...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/2">
                    English
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-1/2">
                    {String(langCode || "").trim().toLowerCase()
                      ? `Translation (${String(langCode || "").trim().toLowerCase()})`
                      : "Translation"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((r) => {
                  const tmdId = r.tmd_id;
                  const isDirty = !!dirty[tmdId];
                  return (
                    <tr key={tmdId} className={isDirty ? "bg-yellow-50" : ""}>
                      <td className="px-4 py-3 align-top">
                        <div className="text-gray-900 font-medium">{r.text}</div>
                        <div className="text-xs text-gray-500 mt-1 font-mono">
                          {tmdId}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <textarea
                          value={translations[tmdId] ?? ""}
                          onChange={(e) => onChangeTranslation(tmdId, e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                          placeholder="Enter translated text"
                        />
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                      No messages found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

