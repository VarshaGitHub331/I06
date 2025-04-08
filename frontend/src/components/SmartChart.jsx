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

const COLORS = [
  "#36A2EB",
  "#FF6384",
  "#FFCE56",
  "#4CAF50",
  "#9C27B0",
  "#FF9800",
  "#00BCD4",
];

export default function SmartChart({ apiResponse }) {
  const [fallbackMode, setFallbackMode] = useState(false);

  if (
    !apiResponse ||
    !apiResponse.data ||
    !Array.isArray(apiResponse.data) ||
    apiResponse.data.length === 0
  ) {
    return <p className="text-gray-500 italic">No valid data to display.</p>;
  }

  const rows = apiResponse.data;
  const firstRow = rows[0];
  const allKeys = Object.keys(firstRow);

  const hasDateKey = allKeys.some(
    (key) =>
      key.toLowerCase().includes("date") ||
      key.toLowerCase().includes("created")
  );

  const isSingleRow = rows.length === 1;
  const isCategoryPie = rows.length > 1 && allKeys.length === 2;

  let chartType = "bar";
  let chartData = {};
  let options = { responsive: true };

  if (isSingleRow) {
    const metrics = firstRow;
    chartData = {
      labels: Object.keys(metrics).map((k) => k.replace(/_/g, " ")),
      datasets: [
        {
          label: "Summary",
          data: Object.values(metrics).map((v) => Number(v) || 0),
          backgroundColor: COLORS,
        },
      ],
    };
    options.indexAxis = "y";
    chartType = "bar";
  } else if (hasDateKey) {
    const dateKey = allKeys.find(
      (k) =>
        k.toLowerCase().includes("date") || k.toLowerCase().includes("created")
    );
    const valueKeys = allKeys.filter((k) => k !== dateKey);

    chartData = {
      labels: rows.map((r) => r[dateKey] || "Unknown"),
      datasets: valueKeys.map((key, idx) => ({
        label: key,
        data: rows.map((r) => Number(r[key]) || 0),
        borderColor: COLORS[idx % COLORS.length],
        fill: false,
        tension: 0.3,
      })),
    };
    chartType = "line";
  } else if (isCategoryPie) {
    const [labelKey, valueKey] = allKeys;
    chartData = {
      labels: rows.map((r) => r[labelKey]),
      datasets: [
        {
          label: valueKey,
          data: rows.map((r) => Number(r[valueKey]) || 0),
          backgroundColor: COLORS,
        },
      ],
    };
    chartType = "pie";
  } else {
    chartData = {
      labels: rows.map((_, i) => `Row ${i + 1}`),
      datasets: allKeys.map((key, idx) => ({
        label: key,
        data: rows.map((r) => Number(r[key]) || 0),
        backgroundColor: COLORS[idx % COLORS.length],
      })),
    };
    chartType = "bar";
  }

  return (
    <div className="p-4 max-w-xl mx-auto bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-center w-full">
          Smart Chart
        </h2>
        <button
          className="text-sm text-blue-600 underline"
          onClick={() => setFallbackMode((prev) => !prev)}
        >
          {fallbackMode ? "View Chart" : "View as Table/JSON"}
        </button>
      </div>

      {!fallbackMode ? (
        <>
          {chartType === "bar" && <Bar data={chartData} options={options} />}
          {chartType === "line" && <Line data={chartData} options={options} />}
          {chartType === "pie" && <Pie data={chartData} options={options} />}
        </>
      ) : (
        <div className="overflow-auto border rounded-md p-4">
          <h3 className="font-medium mb-2 text-gray-700">Tabular Data</h3>
          <table className="min-w-full border-collapse table-auto mb-6">
            <thead>
              <tr className="bg-gray-700 text-left">
                {allKeys.map((key) => (
                  <th
                    key={key}
                    className="border px-3 py-2 text-sm font-medium"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="even:bg-gray-50">
                  {allKeys.map((key) => (
                    <td
                      key={key}
                      className="border px-3 py-2 text-sm text-gray-700"
                    >
                      {row[key]?.toString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-medium mb-2 text-gray-700">Raw JSON</h3>
          <pre className="bg-gray-700 p-3 rounded text-sm overflow-x-auto">
            {JSON.stringify(apiResponse.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
