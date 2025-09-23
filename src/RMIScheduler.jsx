import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  Building,
  Search,
  Filter,
  ChevronDown,
  Undo2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RMIScheduler = () => {
  const [scheduleData, setScheduleData] = useState(() => {
    const saved = localStorage.getItem('rmiSchedule');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedTower, setSelectedTower] = useState('tower1');
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    const saved = localStorage.getItem('collapsedGroups');
    return saved ? JSON.parse(saved) : {};
  });

  // Towers
  const towers = useMemo(
    () => ({
      tower1: { name: 'Tower 1', floors: Array.from({ length: 36 }, (_, i) => i + 5) },
      tower2: { name: 'Tower 2', floors: Array.from({ length: 29 }, (_, i) => i + 4) }
    }),
    []
  );

  // Initialize schedule
  useEffect(() => {
    if (Object.keys(scheduleData).length === 0) {
      const initial = {};
      Object.keys(towers).forEach((towerId) => {
        initial[towerId] = {};
        towers[towerId].floors.forEach((floor) => {
          initial[towerId][floor] = {
            lastMaintenance: null,
            nextMaintenance: null,
            completed: false
          };
        });
      });
      setScheduleData(initial);
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('rmiSchedule', JSON.stringify(scheduleData));
  }, [scheduleData]);

  useEffect(() => {
    localStorage.setItem('collapsedGroups', JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  // Helpers
  const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const addToHistory = (action) => {
    const newAction = { ...action, timestamp: Date.now(), id: Math.random().toString(36).substr(2, 9) };
    setActionHistory((prev) => [newAction, ...prev]);
  };

  const findLastActionForFloor = (towerId, floor) =>
    actionHistory.find((a) => a.towerId === towerId && a.floor === floor);

  const undoAction = (actionId) => {
    const action = actionHistory.find((a) => a.id === actionId);
    if (!action) return;
    setScheduleData((prev) => ({
      ...prev,
      [action.towerId]: { ...prev[action.towerId], [action.floor]: action.previousState }
    }));
    setActionHistory((prev) => prev.filter((a) => a.id !== actionId));
    showNotification(`Undid action for Floor ${action.floor}`, 'success');
  };

  const addMaintenanceDate = (towerId, floor, date) => {
    const prevState = scheduleData[towerId]?.[floor] || { lastMaintenance: null, nextMaintenance: null, completed: false };
    const maintenanceDate = new Date(date);
    const nextMaintenanceDate = addMonths(maintenanceDate, 3);
    const newState = {
      lastMaintenance: maintenanceDate.toISOString().split('T')[0],
      nextMaintenance: nextMaintenanceDate.toISOString().split('T')[0],
      completed: true
    };
    setScheduleData((prev) => ({ ...prev, [towerId]: { ...prev[towerId], [floor]: newState } }));
    const actionId = Math.random().toString(36).substr(2, 9);
    addToHistory({ id: actionId, type: 'schedule', towerId, floor, previousState: prevState, newState, description: `Scheduled maintenance for Floor ${floor}` });
    showNotification(`Floor ${floor} scheduled`, 'success');
  };

  const markAsCompleted = (towerId, floor) => {
    setShowConfirmDialog({
      title: 'Mark Maintenance Complete',
      message: `Mark Floor ${floor} as completed today?`,
      onConfirm: () => {
        const prevState = scheduleData[towerId]?.[floor] || { lastMaintenance: null, nextMaintenance: null, completed: false };
        const today = new Date();
        const nextMaintenanceDate = addMonths(today, 3);
        const newState = {
          lastMaintenance: today.toISOString().split('T')[0],
          nextMaintenance: nextMaintenanceDate.toISOString().split('T')[0],
          completed: true
        };
        setScheduleData((prev) => ({ ...prev, [towerId]: { ...prev[towerId], [floor]: newState } }));
        const actionId = Math.random().toString(36).substr(2, 9);
        addToHistory({ id: actionId, type: 'complete', towerId, floor, previousState: prevState, newState, description: `Completed maintenance for Floor ${floor}` });
        showNotification(`Floor ${floor} marked complete!`, 'success');
        setShowConfirmDialog(null);
      },
      onCancel: () => setShowConfirmDialog(null)
    });
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled');

  const getFloorStatus = (floorData) => {
    if (!floorData?.nextMaintenance) return 'unscheduled';
    const today = new Date();
    const nextDate = new Date(floorData.nextMaintenance);
    const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 7) return 'due-soon';
    return 'scheduled';
  };

  const getStatusBadge = (status) => {
    const colors = {
      overdue: 'bg-red-600',
      'due-soon': 'bg-orange-500',
      scheduled: 'bg-green-600',
      unscheduled: 'bg-gray-400'
    };
    const labels = { overdue: 'Overdue', 'due-soon': 'Due Soon', scheduled: 'Scheduled', unscheduled: 'Not Scheduled' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${colors[status]}`}>{labels[status]}</span>;
  };

  // Stats
  const getStatistics = () => {
    const stats = { overdue: 0, dueSoon: 0, scheduled: 0, unscheduled: 0 };
    Object.keys(towers).forEach((towerId) => {
      const towerData = scheduleData[towerId] || {};
      towers[towerId].floors.forEach((floor) => {
        const status = getFloorStatus(towerData[floor]);
        if (status === 'overdue') stats.overdue++;
        else if (status === 'due-soon') stats.dueSoon++;
        else if (status === 'scheduled') stats.scheduled++;
        else stats.unscheduled++;
      });
    });
    return stats;
  };
  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b">
        <div className="max-w-screen-2xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center"><Building className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-6xl font-light mb-2 text-gray-900">Room Maintenance</h1>
              <p className="text-xl text-gray-500">Manchester Grand Hyatt San Diego</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Statistics */}
      <section className="mb-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {['overdue', 'dueSoon', 'scheduled', 'unscheduled'].map((k) => {
            const colors = { overdue: 'bg-red-600', dueSoon: 'bg-orange-500', scheduled: 'bg-green-600', unscheduled: 'bg-gray-500' };
            const labels = { overdue: 'Overdue', dueSoon: 'Due Soon', scheduled: 'Scheduled', unscheduled: 'Unscheduled' };
            return (
              <motion.div
                key={k + stats[k]}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: [1, 1.15, 1], backgroundColor: ['#fef08a', '#fff'] }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                className="bg-white rounded-lg p-8 text-center shadow"
              >
                <div className={`${colors[k]} text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold`}>
                  {stats[k]}
                </div>
                <h3 className="text-lg font-medium text-gray-600">{labels[k]}</h3>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Floor Grid */}
      <section>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-3xl font-light text-gray-900">{towers[selectedTower].name} Schedule</h2>
            <p className="text-gray-500">Maintenance required every 3 months</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-600">Floor</th>
                <th className="px-6 py-3 text-left text-gray-600">Last Maintenance</th>
                <th className="px-6 py-3 text-left text-gray-600">Next Due</th>
                <th className="px-6 py-3 text-left text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {towers[selectedTower].floors.map((floor) => {
                const floorData = scheduleData[selectedTower]?.[floor] || {};
                const status = getFloorStatus(floorData);
                return (
                  <motion.tr key={floor} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                    <td className="px-6 py-4 text-gray-900">Floor {floor}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(floorData.lastMaintenance)}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(floorData.nextMaintenance)}</td>
                    <td className="px-6 py-4">{getStatusBadge(status)}</td>
                    <td className="px-6 py-4 flex gap-2 items-center">
                      <input type="date" onChange={(e) => e.target.value && addMaintenanceDate(selectedTower, floor, e.target.value)} className="border rounded px-2 py-1" />
                      <button onClick={() => markAsCompleted(selectedTower, floor)} className="p-2 bg-gray-900 text-white rounded"><CheckCircle className="w-4 h-4" /></button>
                      {findLastActionForFloor(selectedTower, floor) && (
                        <button onClick={() => undoAction(findLastActionForFloor(selectedTower, floor).id)} className="p-2 bg-gray-200 rounded"><Undo2 className="w-4 h-4" /></button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RMIScheduler;
