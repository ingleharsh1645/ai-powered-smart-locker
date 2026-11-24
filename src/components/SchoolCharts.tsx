import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type { AttendanceRecord, SubjectMark, TimetableEntry } from '../types/school';

export function SubjectMarksBarChart({ marks }: { marks: SubjectMark[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = marks.map((m) => m.subject);
    const values = marks.map((m) => m.marks);
    const colors = values.map((v) => (v < 65 ? '#DC2626' : v >= 85 ? '#059669' : '#1D4ED8'));

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Test Score (out of 100)',
            data: values,
            backgroundColor: colors,
            borderRadius: 8,
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Score: ${ctx.parsed.y}/100`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.16)' },
            ticks: { color: '#475569', font: { family: 'JetBrains Mono', size: 11 } },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#334155', font: { family: 'Plus Jakarta Sans', size: 11 } },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [marks]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} aria-label="Subject-wise test marks bar chart" />
    </div>
  );
}

export function SyllabusDoughnutChart({ timetable }: { timetable: TimetableEntry[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const coveredAvg =
    timetable.length > 0
      ? Math.round(timetable.reduce((acc, item) => acc + item.syllabusPercent, 0) / timetable.length)
      : 0;
  const remainingAvg = Math.max(0, 100 - coveredAvg);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Syllabus Covered', 'Remaining Syllabus'],
        datasets: [
          {
            data: [coveredAvg, remainingAvg],
            backgroundColor: ['#0284C7', '#E2E8F0'],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 16,
              color: '#334155',
              font: { family: 'Plus Jakarta Sans', size: 12 },
            },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [coveredAvg, remainingAvg]);

  return (
    <div className="relative h-64 w-full flex items-center justify-center">
      <canvas ref={canvasRef} aria-label="Syllabus covered vs remaining doughnut chart" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
        <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{coveredAvg}%</span>
        <span className="text-xs font-medium text-slate-500">Covered</span>
      </div>
    </div>
  );
}

export function AttendanceLineChart({ records }: { records: AttendanceRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels: records.map((r) => r.month),
        datasets: [
          {
            label: 'Monthly Attendance %',
            data: records.map((r) => r.percentage),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            fill: true,
            tension: 0.32,
            pointRadius: 5,
            pointBackgroundColor: '#059669',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Attendance: ${ctx.parsed.y}%`,
            },
          },
        },
        scales: {
          y: {
            min: 60,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.16)' },
            ticks: {
              color: '#475569',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (v) => `${v}%`,
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#334155', font: { family: 'Plus Jakarta Sans', size: 12 } },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [records]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} aria-label="Monthly attendance percentage chart" />
    </div>
  );
}

export function TermProgressChart({ marks }: { marks: SubjectMark[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: marks.map((m) => m.subject),
        datasets: [
          {
            label: 'Unit 1',
            data: marks.map((m) => m.termHistory.unit1),
            backgroundColor: '#94A3B8',
            borderRadius: 4,
          },
          {
            label: 'Mid-Term',
            data: marks.map((m) => m.termHistory.midTerm),
            backgroundColor: '#38BDF8',
            borderRadius: 4,
          },
          {
            label: 'Latest',
            data: marks.map((m) => m.termHistory.latest),
            backgroundColor: '#1D4ED8',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 14,
              color: '#334155',
              font: { family: 'Plus Jakarta Sans', size: 12 },
            },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.16)' },
            ticks: { color: '#475569', font: { family: 'JetBrains Mono', size: 11 } },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#334155', font: { family: 'Plus Jakarta Sans', size: 11 } },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [marks]);

  return (
    <div className="relative h-64 w-full">
      <canvas ref={canvasRef} aria-label="Student test score history chart" />
    </div>
  );
}
