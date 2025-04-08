"use client";
import { useState, useEffect } from "react";
import {
  Users,
  ShoppingCart,
  Table,
  CreditCard,
  Star,
  Layers,
  Download,
  FileCode,
  BarChart3,
  Database,
  Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
export default function Dashboard() {
  const [connections, setConnections] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedConnection, setSellectedCollection] = useState(null);
  const [tables, setTables] = useState([]);
  const [dbtype, setDbType] = useState("");
  const [queryResult, setQueryResult] = useState([]);
  const { user } = useAuth();
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
      const res = await fetch(
        `http://localhost:3001/connection/fetchSchema/?connectionString=${selectedConnection?.connectionString}`,
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
  const results = [
    {
      id: "1001",
      name: "Sophia Martinez",
      product: "Laptop",
      date: "2024-01-15",
      total: "$1200",
    },
    {
      id: "1002",
      name: "Noah Taylor",
      product: "Smartphone",
      date: "2024-02-20",
      total: "$800",
    },
    {
      id: "1003",
      name: "Isabella Brooks",
      product: "Headphones",
      date: "2024-03-10",
      total: "$150",
    },
    {
      id: "1004",
      name: "James Wright",
      product: "Keyboard",
      date: "2024-04-05",
      total: "$75",
    },
  ];

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
                  onClick={() =>
                    setSellectedCollection((selectedConnection) => conn)
                  }
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

        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded mt-4">
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
              placeholder="Type your natural language query or use voice"
              className="w-full pl-4 pr-10 py-2 rounded bg-[#1E293B] text-white placeholder:text-gray-400"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400 w-5 h-5" />
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

        {/* Query Result Table */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Query Result</h2>
          <div className="overflow-x-auto rounded-lg border border-[#334155]">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-[#1E293B] text-white">
                <tr>
                  <th className="px-4 py-2">Order ID</th>
                  <th className="px-4 py-2">Customer Name</th>
                  <th className="px-4 py-2">Product Name</th>
                  <th className="px-4 py-2">Order Date</th>
                  <th className="px-4 py-2">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[#334155] hover:bg-[#1f2a3a]"
                  >
                    <td className="px-4 py-2">{item.id}</td>
                    <td className="px-4 py-2 text-blue-400 hover:underline cursor-pointer">
                      {item.name}
                    </td>
                    <td className="px-4 py-2">{item.product}</td>
                    <td className="px-4 py-2">{item.date}</td>
                    <td className="px-4 py-2">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 absolute bottom-6 right-6">
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
      </div>
    </div>
  );
}
