"use client";
import { useState, useEffect } from "react";
import {
  Layers,
  Download,
  FileCode,
  BarChart3,
  Database,
  Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SmartChart from "@/components/SmartChart";
const DynamicTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-400 text-sm mt-4">No data found.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto mt-4 max-h-[60vh] border border-[#334155] rounded h-auto">
      <table className="min-w-full bg-[#1a1f2b] text-white text-sm">
        <thead className="bg-[#252c3b] text-gray-300">
          <tr>
            {headers.map((key) => (
              <th
                key={key}
                className="px-4 py-3 text-left border-b border-gray-600"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-[#2a3244] transition">
              {headers.map((key) => (
                <td key={key} className="px-4 py-2 border-b border-gray-700">
                  {row[key] !== null ? (
                    row[key].toString()
                  ) : (
                    <span className="text-gray-500 italic">null</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
const MongoDisplay = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-400 text-sm mt-4">No data found.</p>;
  }

  return (
    <div className="bg-[#1a1f2b] border border-[#334155] rounded p-4 overflow-auto max-h-[60vh] text-sm">
      <ul className="space-y-4">
        {data.map((doc, idx) => (
          <li
            key={idx}
            className="bg-[#252c3b] p-4 rounded text-white whitespace-pre-wrap font-mono"
          >
            {JSON.stringify(doc, null, 2)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function Dashboard() {
  const [connections, setConnections] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedConnection, setSellectedCollection] = useState(null);
  const [tables, setTables] = useState([]);
  const [dbtype, setDbType] = useState("");
  const [queryResult, setQueryResult] = useState([]);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [newConnection, setNewConnection] = useState({
    connectionString: "",
    alias: "",
  });
  const [generatingQuery, setGeneratingQuery] = useState(false);
  const [nlQuery, setNlQuery] = useState("");
  const [chartData, setChartData] = useState(null);
  const generateQuery = async () => {
    setGeneratingQuery(true);
    const res = await fetch("http://localhost:3001/connection/generateQuery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connectionString: selectedConnection?.connectionString,
        prompt: nlQuery,
      }),
    });

    const resultData = await res.json();
    if (!res.ok) {
      alert(resultData.message || "Query generation failed. Try again.");
      setGeneratingQuery(false);
      return;
    }

    alert("Query generation successful!");
    setGeneratingQuery(false);
    setNlQuery(""); // Clear the input field after generation
    setChartData(resultData); // 👈 Store response to show chart
    setQueryResult(resultData.data);
  };
  useEffect(() => {
    if (!user) return;
    console.log(user);
    const fetchConnections = async () => {
      const res = await fetch(
        `http://localhost:3001/connection/getConnections/${user?.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      console.log(data);
      if (!res.ok) {
        alert(data.message || "Failed to fetch connections.");
        return;
      }
      setConnections(data);
    };
    fetchConnections();
  }, [user?.id]);
  useEffect(() => {
    if (!selectedConnection) return;
    const fetchCollectionsAndTables = async () => {
      const encodedConnectionString = encodeURIComponent(
        selectedConnection?.connectionString
      );
      const res = await fetch(
        `http://localhost:3001/connection/fetchSchema/?connectionString=${encodedConnectionString}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();
      console.log(data);
      if (!res.ok) {
        alert(data.message || "Failed to fetch tables.");
        return;
      }
      if (data?.length === 0) {
        alert("No tables found in the selected connection.");
        return;
      }
      if (data.type == "mysql" || data.type == "postgresql") {
        setTables((tables) => data.schema);
        setDbType("sql");
      } else {
        setTables((collections) => data.schema);
        setDbType("nosql");
      }
    };
    fetchCollectionsAndTables();
  }, [selectedConnection]);
  useEffect(() => {
    if (!selected || !selectedConnection) return;

    const fetchQueryResult = async () => {
      try {
        const res = await fetch("http://localhost:3001/connection/fetchData", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            connectionString: selectedConnection.connectionString,
            type: selectedConnection.dbType,
            tableName: selected,
          }),
        });

        const data = await res.json();
        console.log(data);

        if (!res.ok) {
          alert(data.message || "Failed to fetch query result.");
          return;
        }

        setQueryResult(data.data);
        console.log(data.data);
      } catch (err) {
        console.error("Error:", err);
        alert("Something went wrong while fetching data.");
      }
    };

    fetchQueryResult();
  }, [selected, selectedConnection]);
  return (
    <div className="flex h-screen bg-[#0F172A] text-white">
      {/* Sidebar */}
      {/* Sidebar */}
      <div className="w-64 flex flex-col justify-between bg-[#131c31] p-4">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 px-2 py-2 bg-[#1E293B] rounded mb-4">
            <Database className="w-5 h-5" />
            <span className="font-semibold">Connections</span>
          </div>

          {/* Render connections */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[70vh] pr-1 scrollbar-thin scrollbar-thumb-[#334155]">
            {connections?.length === 0 ? (
              <span className="text-gray-400 text-sm">
                No connections found.
              </span>
            ) : (
              connections?.map((conn, index) => (
                <button
                  key={conn.id || index}
                  className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[#1E293B] transition-all bg-[#0f172a] border border-[#1e293b] text-left"
                  onClick={() => {
                    setSelected("");
                    setSellectedCollection((selectedConnection) => conn);
                  }}
                >
                  <Layers className="w-4 h-4 text-blue-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {conn.alias || "Unnamed DB"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            setShowModal((showModal) => !showModal);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded mt-4"
        >
          New connection
        </button>
      </div>

      {/* Main Panel */}
      <div className="flex-1 p-6 relative">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="Type your natural language query or use voice"
              className="w-full pl-4 pr-10 py-2 rounded bg-[#1E293B] text-white placeholder:text-gray-400"
            />
            <Search
              className="absolute right-3 top-2.5 text-gray-400 w-5 h-5"
              onClick={(e) => {
                generateQuery();
              }}
            />
          </div>
        </div>

        {/* Table Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">
            {dbtype == "sql"
              ? "Tables"
              : dbtype == "nosql"
              ? "Collections"
              : ""}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {tables?.map((name, index) => (
              <button
                key={index}
                onClick={() => setSelected(name)}
                className={`flex items-center gap-2 px-4 py-2 rounded border ${
                  selected === name
                    ? "bg-[#1E40AF] border-blue-700"
                    : "border-[#334155]"
                }`}
              >
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          {queryResult.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mb-3">Query Result</h2>
              {dbtype === "nosql" ? (
                <MongoDisplay data={queryResult} />
              ) : (
                <DynamicTable data={queryResult} />
              )}
            </>
          )}
        </div>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-transparent bg-opacity-50 flex items-center justify-center">
            <div className="bg-[#1E293B] p-6 rounded-lg w-[90%] max-w-md border border-[#334155] shadow-lg text-white">
              <h2 className="text-lg font-semibold mb-4">New Connection</h2>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Connection String"
                  className="p-2 rounded bg-[#0f172a] border border-[#334155] placeholder:text-gray-400"
                  value={newConnection.connectionString}
                  onChange={(e) =>
                    setNewConnection({
                      ...newConnection,
                      connectionString: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  placeholder="Alias"
                  className="p-2 rounded bg-[#0f172a] border border-[#334155] placeholder:text-gray-400"
                  value={newConnection.alias}
                  onChange={(e) =>
                    setNewConnection({
                      ...newConnection,
                      alias: e.target.value,
                    })
                  }
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Replace this with API call logic
                      const res = await fetch(
                        "http://localhost:3001/connection/connect",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            connectionString: newConnection.connectionString,
                            alias: newConnection.alias,
                            userId: user.id,
                          }),
                        }
                      );

                      const result = await res.json();
                      if (res.ok) {
                        alert("Connection added!");
                        setShowModal(false);
                        setNewConnection({ connectionString: "", alias: "" });
                      } else {
                        alert(result.message || "Failed to add connection.");
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Query Result Table */}
        <div>
          {/* Action Buttons */}
          <div className="flex gap-2 absolute mt-4 right-6">
            <button className="bg-[#334155] hover:bg-[#475569] p-2 rounded">
              <Download className="w-5 h-5 text-white" />
            </button>
            <button className="bg-[#334155] hover:bg-[#475569] p-2 rounded">
              <FileCode className="w-5 h-5 text-white" />
            </button>
            <button className="bg-[#334155] hover:bg-[#475569] p-2 rounded">
              <BarChart3 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        {chartData && (
          <div className="fixed top-0 left-0 right-0 bottom-0 z-40 bg-black bg-opacity-60 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-5xl overflow-auto max-h-[90vh] relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-black"
                onClick={() => setChartData(null)}
              >
                ✕
              </button>
              <SmartChart apiResponse={chartData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
