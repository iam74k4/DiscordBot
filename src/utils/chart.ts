import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, Chart, registerables } from 'chart.js';
import { CHART_COLORS } from './constants.js';

// Chart dimensions
const CHART_WIDTH = 600;
const CHART_HEIGHT = 400;

// Singleton instance for memory efficiency
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
  backgroundColour: CHART_COLORS.BACKGROUND,
  chartCallback: (ChartJS: typeof Chart) => {
    // Register all Chart.js components (controllers, elements, scales, plugins)
    // Required for Chart.js v4+ to avoid "X is not a registered controller" errors
    ChartJS.register(...registerables);
  },
});

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Create a horizontal bar chart for playtime data
 */
export async function createHorizontalBarChart(
  labels: string[],
  data: number[],
  title: string
): Promise<Buffer> {
  const truncatedLabels = labels.map((l) => truncateText(l, 25));

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: truncatedLabels,
      datasets: [
        {
          label: title,
          data,
          backgroundColor: CHART_COLORS.PALETTE[0],
          borderColor: CHART_COLORS.PALETTE[0],
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: title,
          color: CHART_COLORS.TEXT,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: CHART_COLORS.GRID,
          },
          ticks: {
            color: CHART_COLORS.TEXT,
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: CHART_COLORS.TEXT,
          },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}

/**
 * Create a line chart for playtime history
 */
export async function createLineChart(
  labels: string[],
  data: number[],
  title: string
): Promise<Buffer> {
  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: title,
          data,
          borderColor: CHART_COLORS.PALETTE[0],
          backgroundColor: `${CHART_COLORS.PALETTE[0]}33`,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: CHART_COLORS.PALETTE[0],
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: title,
          color: CHART_COLORS.TEXT,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: CHART_COLORS.GRID,
          },
          ticks: {
            color: CHART_COLORS.TEXT,
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          grid: {
            color: CHART_COLORS.GRID,
          },
          ticks: {
            color: CHART_COLORS.TEXT,
          },
          beginAtZero: false,
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}

/**
 * Create a pie/doughnut chart for statistics
 */
export async function createPieChart(
  labels: string[],
  data: number[],
  title: string
): Promise<Buffer> {
  const config: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: CHART_COLORS.PALETTE.slice(0, labels.length),
          borderColor: CHART_COLORS.BACKGROUND,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: CHART_COLORS.TEXT,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: title,
          color: CHART_COLORS.TEXT,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(config);
}
