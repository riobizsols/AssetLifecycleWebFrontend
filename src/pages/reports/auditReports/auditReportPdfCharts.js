import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  BarController,
  Legend,
  Title,
  Tooltip,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  BarController,
  Legend,
  Title,
  Tooltip,
);

const PALETTE = [
  '#143d65',
  '#1e5a8a',
  '#2f7ab8',
  '#0f766e',
  '#b45309',
  '#be123c',
  '#7c3aed',
  '#475569',
  '#0369a1',
  '#a16207',
];

const STATUS_FULL_FORM = {
  IN: 'Initiated',
  IP: 'In progress',
  CO: 'Completed',
  CA: 'Cancelled',
  CR: 'Created',
  AP: 'Approved',
  RJ: 'Rejected',
  RE: 'Reopened',
  OH: 'On hold',
  UA: 'Under approval',
  UL: 'Under maintenance',
  SC: 'Scrapped',
  SS: 'Scrap sold',
  AC: 'Active',
  IA: 'Inactive',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

function statusLabel(value) {
  if (value == null || value === '') return 'Unknown';
  const raw = String(value).trim();
  const upper = raw.toUpperCase();
  return STATUS_FULL_FORM[upper] || raw;
}

function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows || []) {
    const key = String(keyFn(row) || 'Unknown').trim() || 'Unknown';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function truncateLabel(text, max = 28) {
  const s = String(text || '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Draw numeric labels on bars / doughnut slices */
const valueLabelPlugin = {
  id: 'auditValueLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;

    const values = data.datasets[0].data || [];
    const total = values.reduce((s, v) => s + (Number(v) || 0), 0) || 1;
    const isBar = chart.config.type === 'bar';
    const horizontal = isBar && chart.options.indexAxis === 'y';

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 22px Helvetica, Arial, sans-serif';

    meta.data.forEach((element, index) => {
      const value = Number(values[index]) || 0;
      if (!value) return;

      const props = element.getProps(['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius', 'base'], true);

      if (isBar) {
        ctx.fillStyle = '#0f172a';
        if (horizontal) {
          const x = props.x + 18;
          const y = props.y;
          // Keep label inside chart area
          const drawX = Math.min(x, chartArea.right - 24);
          ctx.textAlign = 'left';
          ctx.fillText(String(value), drawX, y);
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(String(value), props.x, props.y - 14);
        }
        return;
      }

      // Doughnut: place count + % in slice mid-angle
      const mid = (props.startAngle + props.endAngle) / 2;
      const radius = (props.innerRadius + props.outerRadius) / 2;
      const x = element.x + Math.cos(mid) * radius;
      const y = element.y + Math.sin(mid) * radius;
      const pct = Math.round((value / total) * 100);
      const label = `${value} (${pct}%)`;

      // Dark text with light halo for contrast on any slice color
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    });

    ctx.restore();
  },
};

function renderChartImage({
  type,
  labels,
  values,
  title,
  subtitle,
  horizontal = false,
  width = 1600,
  height = 780,
}) {
  if (!labels.length || values.every((v) => !v)) return null;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Soft card border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  const total = values.reduce((s, v) => s + (Number(v) || 0), 0);
  const legendLabels = labels.map((label, i) => {
    const v = Number(values[i]) || 0;
    const pct = total ? Math.round((v / total) * 100) : 0;
    return `${truncateLabel(label, 34)}  —  ${v}  (${pct}%)`;
  });

  const chart = new Chart(ctx, {
    type,
    data: {
      labels: labels.map((l) => truncateLabel(l, horizontal ? 36 : 22)),
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#ffffff',
          borderWidth: type === 'doughnut' ? 3 : 0,
          borderRadius: type === 'bar' ? 6 : 0,
          maxBarThickness: horizontal ? 42 : 48,
          barPercentage: 0.75,
          categoryPercentage: 0.8,
        },
      ],
    },
    plugins: [valueLabelPlugin],
    options: {
      animation: false,
      responsive: false,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      layout: {
        padding: {
          top: 8,
          right: type === 'doughnut' ? 24 : 28,
          bottom: 8,
          left: 12,
        },
      },
      plugins: {
        title: {
          display: true,
          text: subtitle ? [title, subtitle] : title,
          color: '#0f172a',
          font: { size: 24, weight: '700', family: 'Helvetica, Arial, sans-serif' },
          padding: { top: 16, bottom: 18 },
          align: 'start',
        },
        legend: {
          display: type === 'doughnut',
          position: 'right',
          align: 'center',
          labels: {
            color: '#1e293b',
            boxWidth: 18,
            boxHeight: 18,
            padding: 16,
            font: { size: 15, family: 'Helvetica, Arial, sans-serif' },
            generateLabels(chartInstance) {
              const ds = chartInstance.data.datasets[0];
              return (chartInstance.data.labels || []).map((label, i) => ({
                text: legendLabels[i] || String(label),
                fillStyle: Array.isArray(ds.backgroundColor)
                  ? ds.backgroundColor[i]
                  : ds.backgroundColor,
                strokeStyle: '#ffffff',
                lineWidth: 0,
                hidden: false,
                index: i,
              }));
            },
          },
        },
        tooltip: { enabled: false },
      },
      scales:
        type === 'bar'
          ? horizontal
            ? {
                x: {
                  beginAtZero: true,
                  ticks: {
                    color: '#334155',
                    font: { size: 14, family: 'Helvetica, Arial, sans-serif' },
                    precision: 0,
                  },
                  grid: { color: '#e2e8f0', drawBorder: false },
                  title: {
                    display: true,
                    text: 'Count',
                    color: '#475569',
                    font: { size: 14, weight: '600' },
                  },
                },
                y: {
                  ticks: {
                    color: '#334155',
                    font: { size: 14, family: 'Helvetica, Arial, sans-serif' },
                    autoSkip: false,
                  },
                  grid: { display: false, drawBorder: false },
                },
              }
            : {
                x: {
                  ticks: {
                    color: '#334155',
                    font: { size: 14, family: 'Helvetica, Arial, sans-serif' },
                    maxRotation: 35,
                    minRotation: 0,
                    autoSkip: false,
                  },
                  grid: { display: false, drawBorder: false },
                },
                y: {
                  beginAtZero: true,
                  ticks: {
                    color: '#334155',
                    font: { size: 14, family: 'Helvetica, Arial, sans-serif' },
                    precision: 0,
                  },
                  grid: { color: '#e2e8f0', drawBorder: false },
                  title: {
                    display: true,
                    text: 'Count',
                    color: '#475569',
                    font: { size: 14, weight: '600' },
                  },
                },
              }
          : undefined,
    },
  });

  // Force one paint then export
  chart.update('none');
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  chart.destroy();
  return dataUrl;
}

/**
 * Build production chart images from live audit report rows only.
 */
export function buildAuditReportCharts({ report, enrichedAssets }) {
  const charts = [];
  const sections = report?.sections || {};
  const assets = enrichedAssets || [];
  const periodLabel = report?.period?.label || 'Selected period';
  const assetCount = assets.length;

  const evidence = [
    { label: 'Maintenance', value: sections.maintenance?.length || 0 },
    { label: 'Breakdowns', value: sections.breakdown?.length || 0 },
    { label: 'Certifications', value: sections.certifications?.length || 0 },
    { label: 'Invoices', value: sections.invoices?.length || 0 },
    { label: 'Purchase orders', value: sections.purchaseOrders?.length || 0 },
  ].filter((d) => d.value > 0);

  if (evidence.length) {
    const total = evidence.reduce((s, d) => s + d.value, 0);
    const img = renderChartImage({
      type: 'doughnut',
      labels: evidence.map((d) => d.label),
      values: evidence.map((d) => d.value),
      title: 'Evidence records by category',
      subtitle: `${periodLabel} · ${total} records across ${assetCount} assets`,
    });
    if (img) charts.push({ key: 'evidence', image: img, aspect: 1600 / 780 });
  }

  const byType = countBy(assets, (a) => a.asset_type_name || 'Unknown type').slice(0, 10);
  if (byType.length && assetCount > 0) {
    const img = renderChartImage({
      type: 'bar',
      labels: byType.map((d) => d.label),
      values: byType.map((d) => d.value),
      title: 'Assets by asset type',
      subtitle: `${assetCount} assets in scope`,
      horizontal: true,
      height: Math.max(560, 180 + byType.length * 56),
    });
    if (img) charts.push({ key: 'byType', image: img, aspect: 1600 / Math.max(560, 180 + byType.length * 56) });
  }

  const byStatus = countBy(assets, (a) => statusLabel(a.asset_status));
  if (byStatus.length && assetCount > 0) {
    const img = renderChartImage({
      type: 'doughnut',
      labels: byStatus.map((d) => d.label),
      values: byStatus.map((d) => d.value),
      title: 'Assets by status',
      subtitle: `${assetCount} assets`,
    });
    if (img) charts.push({ key: 'byStatus', image: img, aspect: 1600 / 780 });
  }

  const byLocation = countBy(assets, (a) => a.branch_name || 'No location').slice(0, 10);
  if (byLocation.length && assetCount > 0) {
    const img = renderChartImage({
      type: 'bar',
      labels: byLocation.map((d) => d.label),
      values: byLocation.map((d) => d.value),
      title: 'Assets by location',
      subtitle: `${assetCount} assets`,
      horizontal: true,
      height: Math.max(560, 180 + byLocation.length * 56),
    });
    if (img) {
      charts.push({
        key: 'byLocation',
        image: img,
        aspect: 1600 / Math.max(560, 180 + byLocation.length * 56),
      });
    }
  }

  const byDept = countBy(assets, (a) => a.department_name || 'No department').slice(0, 10);
  if (byDept.length > 1 && assetCount > 0) {
    const img = renderChartImage({
      type: 'bar',
      labels: byDept.map((d) => d.label),
      values: byDept.map((d) => d.value),
      title: 'Assets by department',
      subtitle: `${assetCount} assets`,
      horizontal: true,
      height: Math.max(560, 180 + byDept.length * 56),
    });
    if (img) {
      charts.push({
        key: 'byDept',
        image: img,
        aspect: 1600 / Math.max(560, 180 + byDept.length * 56),
      });
    }
  }

  const maintByStatus = countBy(sections.maintenance, (r) => statusLabel(r.status));
  if (maintByStatus.length && (sections.maintenance?.length || 0) > 0) {
    const img = renderChartImage({
      type: 'doughnut',
      labels: maintByStatus.map((d) => d.label),
      values: maintByStatus.map((d) => d.value),
      title: 'Maintenance by status',
      subtitle: `${sections.maintenance.length} maintenance records · ${periodLabel}`,
    });
    if (img) charts.push({ key: 'maintStatus', image: img, aspect: 1600 / 780 });
  }

  const brByStatus = countBy(sections.breakdown, (r) => statusLabel(r.breakdown_status));
  if (brByStatus.length && (sections.breakdown?.length || 0) > 0) {
    const img = renderChartImage({
      type: 'doughnut',
      labels: brByStatus.map((d) => d.label),
      values: brByStatus.map((d) => d.value),
      title: 'Breakdowns by status',
      subtitle: `${sections.breakdown.length} breakdown records · ${periodLabel}`,
    });
    if (img) charts.push({ key: 'brStatus', image: img, aspect: 1600 / 780 });
  }

  return charts;
}

/**
 * Place charts full-width, one per row, perfectly aligned to page margins.
 * Returns next y after charts (and may add pages).
 */
export function placeChartsInPdf(pdf, charts, { margin = 40, startY = 40 } = {}) {
  if (!charts?.length) return startY;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = startY;

  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Visual summary', margin, y);
  y += 10;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Counts are calculated from the assets and history returned by this report.', margin, y);
  y += 16;

  for (const chart of charts) {
    const aspect = chart.aspect || 1600 / 780;
    const chartHeight = contentWidth / aspect;
    const blockHeight = chartHeight + 12;

    if (y + blockHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }

    // Aligned card frame
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, y, contentWidth, chartHeight, 4, 4, 'S');
    pdf.addImage(chart.image, 'PNG', margin, y, contentWidth, chartHeight, undefined, 'FAST');
    y += blockHeight;
  }

  return y;
}
