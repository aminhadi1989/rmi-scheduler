import React, { useState, useEffect } from "react";
import {
  Calendar, Bell, CheckCircle, Clock, Building, Search, Filter,
  ChevronDown, Undo2, AlertTriangle
} from "lucide-react";

// Hyatt Scheduler Component
const RMIScheduler = () => {
  // ====== STATE ======
  const [scheduleData, setScheduleData] = useState(() => {
    const saved = localStorage.getItem("rmiSchedule");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedTower, setSelectedTower] = useState("harbor");
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notification, setNotification] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);

  // ====== TOWERS ======
  const towers = {
    harbor: { 
      name: "HARBOR", 
      floors: [5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]
    },
    seaport: { 
      name: "SEAPORT", 
      floors: [4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]
    }
  };

  // ====== INIT DATA ======
  useEffect(() => {
    if (Object.keys(scheduleData).length === 0) {
      const initialSchedule = {};
      Object.keys(towers).forEach(towerId => {
        initialSchedule[towerId] = {};
        towers[towerId].floors.forEach(floor => {
          initialSchedule[towerId][floor] = {
            lastMaintenance: null,
            nextMaintenance: null,
            completed: false
          };
        });
      });
      setScheduleData(initialSchedule);
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem("rmiSchedule", JSON.stringify(scheduleData));
  }, [scheduleData]);

  // ====== REMINDERS ======
  useEffect(() => {
    const reminders = [];
    const today = new Date();

    Object.keys(towers).forEach(towerId => {
      if (scheduleData[towerId]) {
        towers[towerId].floors.forEach(floor => {
          const floorData = scheduleData[towerId][floor];
          if (floorData?.nextMaintenance) {
            const nextDate = new Date(floorData.nextMaintenance);
            const daysUntil = Math.ceil((nextDate - today) / (24 * 60 * 60 * 1000));
            if (daysUntil <= 7 && daysUntil >= 0) {
              reminders.push({
                towerId,
                towerName: towers[towerId].name,
                floor,
                nextDate,
                daysUntil
              });
            }
          }
        });
      }
    });

    reminders.sort((a, b) => a.daysUntil - b.daysUntil);
    setUpcomingReminders(reminders);
  }, [scheduleData]);

  // ====== HELPERS ======
  const showNotification = (message, type = "success", showUndo = false, undoAction = null) => {
    setNotification({ message, type, showUndo, undoAction });
    setTimeout(() => setNotification(null), showUndo ? 8000 : 4000);
  };

  const addToHistory = (action) => {
    const newAction = { ...action, timestamp: Date.now(), id: Math.random().toString(36).substr(2, 9) };
    setActionHistory(prev => [newAction, ...prev.slice(0, 9)]);
  };

  const undoAction = (actionId) => {
    const action = actionHistory.find(a => a.id === actionId);
    if (!action) return;
    setScheduleData(prev => ({
      ...prev,
      [action.towerId]: { ...prev[action.towerId], [action.floor]: action.previousState }
    }));
    setActionHistory(prev => prev.filter(a => a.id !== actionId));
    setNotification(null);
    showNotification(`Undid action for Floor ${action.floor}`, "success");
  };

  const addMaintenanceDate = (towerId, floor, date) => {
    const previousState = scheduleData[towerId]?.[floor] || { lastMaintenance: null, nextMaintenance: null, completed: false };
    const maintenanceDate = new Date(date);
    const nextMaintenanceDate = new Date(maintenanceDate);
    nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3);
    const newState = {
      lastMaintenance: maintenanceDate.toISOString().split("T")[0],
      nextMaintenance: nextMaintenanceDate.toISOString().split("T")[0],
      completed: true
    };
    setScheduleData(prev => ({ ...prev, [towerId]: { ...prev[towerId], [floor]: newState } }));
    const actionId = Math.random().toString(36).substr(2, 9);
    addToHistory({ id: actionId, type: "schedule", towerId, floor, previousState, newState });
    showNotification(`Floor ${floor} maintenance scheduled successfully`, "success", true, () => undoAction(actionId));
  };

  const markAsCompleted = (towerId, floor) => {
    setShowConfirmDialog({
      title: "Mark Maintenance Complete",
      message: `Are you sure you want to mark Floor ${floor} maintenance as completed today?`,
      onConfirm: () => {
        const today = new Date();
        const nextMaintenanceDate = new Date(today);
        nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3);
        const newState = {
          lastMaintenance: today.toISOString().split("T")[0],
          nextMaintenance: nextMaintenanceDate.toISOString().split("T")[0],
          completed: true
        };
        setScheduleData(prev => ({ ...prev, [towerId]: { ...prev[towerId], [floor]: newState } }));
        showNotification(`Floor ${floor} marked as completed!`, "success");
        setShowConfirmDialog(null);
      },
      onCancel: () => setShowConfirmDialog(null)
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getFloorStatus = (floorData) => {
    if (!floorData?.nextMaintenance) return "unscheduled";
    const today = new Date();
    const nextDate = new Date(floorData.nextMaintenance);
    const daysUntil = Math.ceil((nextDate - today) / (24 * 60 * 60 * 1000));
    if (daysUntil < 0) return "overdue";
    if (daysUntil <= 7) return "due-soon";
    return "scheduled";
  };

  // ====== FILTER ======
  const filteredFloors = towers[selectedTower].floors.filter(floor => {
    const floorData = scheduleData[selectedTower]?.[floor] || {};
    const status = getFloorStatus(floorData);
    return floor.toString().includes(searchTerm) && (statusFilter === "all" || status === statusFilter);
  });

  // ====== UI ======
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* HEADER */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-light text-gray-900">Room Maintenance</h1>
              <p className="text-gray-500">Manchester Grand Hyatt San Diego</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">{new Date().toLocaleDateString()}</div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-screen-2xl mx-auto px-6 py-12 bg-gray-50">
        {/* Urgent Reminders */}
        {upcomingReminders.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-medium text-[#FA5D29] mb-6">Urgent Reminders</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingReminders.map((r, i) => (
                <div key={i} className="bg-white border-l-4 rounded-lg p-6 shadow hover:shadow-lg transition-all" style={{ borderLeftColor: "#FA5D29" }}>
                  <div className="flex justify-between">
                    <h3 className="font-medium">{r.towerName} – Floor {r.floor}</h3>
                    <span className="px-3 py-1 text-white text-sm rounded-full animate-pulse-slow" style={{ background: "#FA5D29" }}>
                      {r.daysUntil === 0 ? "Today" : `${r.daysUntil}d`}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Due {formatDate(r.nextDate)}</p>
                  <button
                    onClick={() => markAsCompleted(r.towerId, r.floor)}
                    className="mt-4 w-full bg-gray-900 text-white px-4 py-2 rounded hover:shadow-md"
                  >
                    Mark Complete
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Floor Grid */}
        <section>
          <h2 className="text-xl font-medium text-gray-900 mb-4">{towers[selectedTower].name} Schedule</h2>
          <table className="w-full bg-white rounded-lg shadow overflow-hidden">
            <thead className="bg-gray-100 text-gray-600 text-sm">
              <tr>
                <th className="p-3 text-left">Floor</th>
                <th className="p-3 text-left">Last Maintenance</th>
                <th className="p-3 text-left">Next Due</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFloors.map((floor) => {
                const floorData = scheduleData[selectedTower]?.[floor] || {};
                const status = getFloorStatus(floorData);
                return (
                  <tr key={floor} className="border-t hover:bg-gray-50">
                    <td className="p-3">Floor {floor}</td>
                    <td className="p-3">{formatDate(floorData.lastMaintenance)}</td>
                    <td className="p-3">{formatDate(floorData.nextMaintenance)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        status === "overdue" ? "bg-red-600 text-white" :
                        status === "due-soon" ? "bg-orange-500 text-white animate-pulse-slow" :
                        status === "scheduled" ? "bg-green-600 text-white" :
                        "bg-gray-400 text-white"
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <input type="date" className="border rounded px-2" onChange={(e) => e.target.value && addMaintenanceDate(selectedTower, floor, e.target.value)} />
                      <button onClick={() => markAsCompleted(selectedTower, floor)} className="p-2 bg-gray-900 text-white rounded"><CheckCircle size={16} /></button>
                      <button onClick={() => showNotification("Undo clicked")} className="p-2 bg-gray-200 text-orange-600 rounded"><Undo2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default RMIScheduler;
