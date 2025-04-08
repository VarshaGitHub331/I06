import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend
);

export default function SmartChart({ apiResponse }) {
  const [fallbackMode, setFallbackMode] = useState(false);

  const chartResponse = apiResponse?.chartData;

  const isValid =
    chartResponse &&
    typeof chartResponse === "object" &&
    ["bar", "line", "pie"].includes(chartResponse.type?.toLowerCase()) &&
    Array.isArray(chartResponse.labels) &&
    Array.isArray(chartResponse.datasets);

  if (!isValid) {
    return (
      <p className="text-gray-500 italic">No valid chart data to display.</p>
    );
  }

  const chartType = chartResponse.type.toLowerCase();

  const chartData = {
    labels: chartResponse.labels,
    datasets: chartResponse.datasets.map((dataset, i) => ({
      backgroundColor:
        dataset.backgroundColor ??
        (chartType === "pie"
          ? [
              "#36A2EB",
              "#FF6384",
              "#FFCE56",
              "#4CAF50",
              "#9C27B0",
              "#FF9800",
              "#00BCD4",
            ]
          : "#36A2EB"),
      borderColor: dataset.borderColor ?? "#333",
      borderWidth: 1,
      ...dataset,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: chartType === "pie" ? "right" : "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales:
      chartType !== "pie"
        ? {
            x: {
              beginAtZero: true,
              ticks: { autoSkip: true, maxTicksLimit: 10 },
            },
            y: {
              beginAtZero: true,
            },
          }
        : {},
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-center w-full">
          Smart Chart
        </h2>
        <button
          className="text-sm text-blue-600 underline"
          onClick={() => setFallbackMode((prev) => !prev)}
        >
          {fallbackMode ? "View Chart" : "View as JSON"}
        </button>
      </div>

      {!fallbackMode ? (
        <div className="h-[400px]">
          {chartType === "bar" && <Bar data={chartData} options={options} />}
          {chartType === "line" && <Line data={chartData} options={options} />}
          {chartType === "pie" && <Pie data={chartData} options={options} />}
        </div>
      ) : (
        <div className="overflow-auto border rounded-md p-4">
          <h3 className="font-medium mb-2 text-gray-700">Raw Chart Data</h3>
          <pre className="bg-gray-800 p-3 rounded text-sm text-white overflow-x-auto">
            {JSON.stringify(chartResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
