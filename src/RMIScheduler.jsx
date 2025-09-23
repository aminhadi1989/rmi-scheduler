import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Bell, CheckCircle, Clock, Building, Search, Filter,
  ChevronDown, Undo2, AlertTriangle, X, Sparkles
} from 'lucide-react';

const RMIScheduler = () => {
  const [scheduleData, setScheduleData] = useState(() => {
    const saved = localStorage.getItem('rmiSchedule');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedTower, setSelectedTower] = useState('harbor');
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [highlightedRow, setHighlightedRow] = useState(null);

  // Tower configurations
  const towers = {
    harbor: { 
      name: 'HARBOR', 
      floors: [5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]
    },
    seaport: { 
      name: 'SEAPORT', 
      floors: [4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]
    }
  };

  // Initialize schedule data if empty
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

  // Save to localStorage whenever scheduleData changes
  useEffect(() => {
    localStorage.setItem('rmiSchedule', JSON.stringify(scheduleData));
  }, [scheduleData]);

  // Calculate upcoming reminders
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

  const showNotification = (message, type = 'success', showUndo = false, undoAction = null) => {
    setNotification({ message, type, showUndo, undoAction });
    setTimeout(() => setNotification(null), showUndo ? 8000 : 4000);
  };

  const addToHistory = (action) => {
    const newAction = {
      ...action,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    setActionHistory(prev => [newAction, ...prev.slice(0, 9)]);
  };

  const undoAction = (actionId) => {
    const action = actionHistory.find(a => a.id === actionId);
    if (!action) return;

    setScheduleData(prev => ({
      ...prev,
      [action.towerId]: {
        ...prev[action.towerId],
        [action.floor]: action.previousState
      }
    }));

    setActionHistory(prev => prev.filter(a => a.id !== actionId));
    setNotification(null);
    
    // Highlight the affected row
    setHighlightedRow(`${action.towerId}-${action.floor}`);
    setTimeout(() => setHighlightedRow(null), 2000);
    
    showNotification(`Undid action for Floor ${action.floor}`, 'success');
  };

  const addMaintenanceDate = (towerId, floor, date) => {
    const previousState = scheduleData[towerId]?.[floor] || { lastMaintenance: null, nextMaintenance: null, completed: false };
    
    const maintenanceDate = new Date(date);
    const nextMaintenanceDate = new Date(maintenanceDate);
    nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3);

    const newState = {
      lastMaintenance: maintenanceDate.toISOString().split('T')[0],
      nextMaintenance: nextMaintenanceDate.toISOString().split('T')[0],
      completed: true
    };

    setScheduleData(prev => ({
      ...prev,
      [towerId]: {
        ...prev[towerId],
        [floor]: newState
      }
    }));

    const actionId = Math.random().toString(36).substr(2, 9);
    addToHistory({
      id: actionId,
      type: 'schedule',
      towerId,
      floor,
      previousState,
      newState,
      description: `Scheduled maintenance for Floor ${floor}`
    });

    // Highlight the affected row
    setHighlightedRow(`${towerId}-${floor}`);
    setTimeout(() => setHighlightedRow(null), 2000);

    showNotification(
      `Floor ${floor} maintenance scheduled successfully`, 
      'success', 
      true, 
      () => undoAction(actionId)
    );
  };

  const markAsCompleted = (towerId, floor) => {
    setShowConfirmDialog({
      title: 'Mark Maintenance Complete',
      message: `Are you sure you want to mark Floor ${floor} maintenance as completed today?`,
      onConfirm: () => {
        const previousState = scheduleData[towerId]?.[floor] || { lastMaintenance: null, nextMaintenance: null, completed: false };
        
        const today = new Date();
        const nextMaintenanceDate = new Date(today);
        nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + 3);

        const newState = {
          lastMaintenance: today.toISOString().split('T')[0],
          nextMaintenance: nextMaintenanceDate.toISOString().split('T')[0],
          completed: true
        };

        setScheduleData(prev => ({
          ...prev,
          [towerId]: {
            ...prev[towerId],
            [floor]: newState
          }
        }));

        const actionId = Math.random().toString(36).substr(2, 9);
        addToHistory({
          id: actionId,
          type: 'complete',
          towerId,
          floor,
          previousState,
          newState,
          description: `Completed maintenance for Floor ${floor}`
        });

        // Highlight the affected row
        setHighlightedRow(`${towerId}-${floor}`);
        setTimeout(() => setHighlightedRow(null), 2000);

        showNotification(
          `Floor ${floor} marked as completed!`, 
          'success', 
          true, 
          () => undoAction(actionId)
        );
        setShowConfirmDialog(null);
      },
      onCancel: () => setShowConfirmDialog(null)
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getFloorStatus = (floorData) => {
    if (!floorData?.nextMaintenance) return 'unscheduled';
    
    const today = new Date();
    const nextDate = new Date(floorData.nextMaintenance);
    const daysUntil = Math.ceil((nextDate - today) / (24 * 60 * 60 * 1000));
    
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 7) return 'due-soon';
    return 'scheduled';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'overdue': 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-200',
      'due-soon': 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-orange-200',
      'scheduled': 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-200',
      'unscheduled': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-gray-200'
    };
    
    const labels = {
      'overdue': 'Overdue',
      'due-soon': 'Due Soon',
      'scheduled': 'Scheduled',
      'unscheduled': 'Not Scheduled'
    };
    
    return (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-lg ${badges[status]} ${
          status === 'overdue' || status === 'due-soon' ? 'animate-pulse' : ''
        }`}
      >
        {labels[status]}
      </motion.span>
    );
  };

  const filteredFloors = towers[selectedTower].floors.filter(floor => {
    const floorData = scheduleData[selectedTower]?.[floor] || {};
    const status = getFloorStatus(floorData);
    const matchesSearch = floor.toString().includes(searchTerm);
    const matchesFilter = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatistics = () => {
    const stats = { overdue: 0, dueSoon: 0, scheduled: 0, unscheduled: 0 };
    
    Object.keys(towers).forEach(towerId => {
      const towerData = scheduleData[towerId] || {};
      towers[towerId].floors.forEach(floor => {
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

  const undoLastActionForFloor = (towerId, floor) => {
    const lastAction = actionHistory.find(a => a.towerId === towerId && a.floor === floor);
    if (lastAction) {
      undoAction(lastAction.id);
    } else {
      showNotification("No recent action found for this floor to undo.", 'warning');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg"
              >
                <Building className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <motion.h1 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-5xl font-light mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
                  style={{ 
                    fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', 
                    fontVariationSettings: '"wght" 200',
                    lineHeight: '1.1'
                  }}
                >
                  Room Maintenance
                </motion.h1>
                <motion.p 
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-lg text-gray-600 font-light"
                  style={{ fontVariationSettings: '"wght" 300' }}
                >
                  Manchester Grand Hyatt San Diego
                </motion.p>
              </div>
            </div>
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex items-center gap-4"
            >
              <div className="text-right">
                <div className="text-sm text-gray-500 font-medium">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Urgent Reminders */}
        <AnimatePresence>
          {upcomingReminders.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="flex items-center gap-3 mb-8"
              >
                <Sparkles className="w-6 h-6 text-orange-500" />
                <h2 className="text-3xl font-light text-orange-600">
                  Urgent Reminders
                </h2>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingReminders.map((reminder, index) => (
                  <motion.div
                    key={`${reminder.towerId}-${reminder.floor}`}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="bg-white rounded-2xl p-6 border-l-4 border-orange-400 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-1 text-lg">
                          {reminder.towerName}
                        </h3>
                        <p className="text-2xl font-light text-gray-700">
                          Floor {reminder.floor}
                        </p>
                      </div>
                      <motion.span
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm px-3 py-1 rounded-full font-medium shadow-lg"
                      >
                        {reminder.daysUntil === 0 ? 'Today' : `${reminder.daysUntil}d`}
                      </motion.span>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Due: {formatDate(reminder.nextDate.toISOString().split('T')[0])}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => markAsCompleted(reminder.towerId, reminder.floor)}
                      className="w-full bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:from-gray-900 hover:to-black transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Mark Complete
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Statistics Cards */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-12"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { key: 'overdue', value: stats.overdue, label: 'Overdue', color: 'red', gradient: 'from-red-500 to-red-600' },
              { key: 'dueSoon', value: stats.dueSoon, label: 'Due Soon', color: 'orange', gradient: 'from-orange-400 to-orange-500' },
              { key: 'scheduled', value: stats.scheduled, label: 'Scheduled', color: 'green', gradient: 'from-green-500 to-green-600' },
              { key: 'unscheduled', value: stats.unscheduled, label: 'Unscheduled', color: 'gray', gradient: 'from-gray-500 to-gray-600' }
            ].map((stat, index) => (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className={`bg-gradient-to-r ${stat.gradient} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <motion.span
                    key={stat.value}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-white text-xl font-bold"
                  >
                    {stat.value}
                  </motion.span>
                </div>
                <h3 className="text-center font-medium text-gray-700">{stat.label}</h3>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Controls */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-6 items-center justify-between">
            {/* Tower Selection */}
            <div className="flex gap-3">
              {Object.keys(towers).map((towerId, index) => (
                <motion.button
                  key={towerId}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedTower(towerId)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg ${
                    selectedTower === towerId
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {towers[towerId].name}
                </motion.button>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 items-center">
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="relative"
              >
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search floors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
                />
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <Filter className="w-5 h-5 text-gray-600" />
                  Filter
                  <motion.div
                    animate={{ rotate: showFilters ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </motion.div>
                </motion.button>
                
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-10 min-w-48 overflow-hidden"
                    >
                      {['all', 'overdue', 'due-soon', 'scheduled', 'unscheduled'].map((filter, index) => (
                        <motion.button
                          key={filter}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          whileHover={{ backgroundColor: '#f8fafc' }}
                          onClick={() => {
                            setStatusFilter(filter);
                            setShowFilters(false);
                          }}
                          className={`w-full text-left px-4 py-3 transition-all duration-200 ${
                            statusFilter === filter ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {filter === 'all' ? 'All Floors' : 
                           filter === 'due-soon' ? 'Due Soon' :
                           filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Floor Grid */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-2xl font-light text-gray-800 mb-2">
                {towers[selectedTower].name} Schedule
              </h2>
              <p className="text-gray-600">
                Maintenance required every 3 months
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-8 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Floor</th>
                    <th className="text-left px-8 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Last Maintenance</th>
                    <th className="text-left px-8 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Next Due</th>
                    <th className="text-left px-8 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-8 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  <AnimatePresence>
                    {filteredFloors.map((floor, index) => {
                      const floorData = scheduleData[selectedTower]?.[floor] || {};
                      const status = getFloorStatus(floorData);
                      const rowKey = `${selectedTower}-${floor}`;
                      const isHighlighted = highlightedRow === rowKey;
                      
                      return (
                        <motion.tr
                          key={rowKey}
                          initial={{ opacity: 0, x: -50 }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                            backgroundColor: isHighlighted ? '#fef3c7' : 'transparent'
                          }}
                          exit={{ opacity: 0, x: 50 }}
                          transition={{ 
                            delay: index * 0.05, 
                            duration: 0.4,
                            backgroundColor: { duration: 0.5 }
                          }}
                          whileHover={{ backgroundColor: '#f8fafc' }}
                          className="group"
                        >
                          <td className="px-8 py-6">
                            <span className="text-xl font-light text-gray-800">
                              Floor {floor}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-gray-600">
                            {formatDate(floorData.lastMaintenance)}
                          </td>
                          <td className="px-8 py-6 text-gray-600">
                            {formatDate(floorData.nextMaintenance)}
                          </td>
                          <td className="px-8 py-6">
                            {getStatusBadge(status)}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex gap-3 items-center">
                              <motion.input
                                whileFocus={{ scale: 1.02 }}
                                type="date"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    addMaintenanceDate(selectedTower, floor, e.target.value);
                                  }
                                }}
                                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-sm"
                              />
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => markAsCompleted(selectedTower, floor)}
                                className="p-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg transition-all duration-300 hover:shadow-lg group-hover:scale-105"
                                title="Mark as completed today"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => undoLastActionForFloor(selectedTower, floor)}
                                className="p-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg transition-all duration-300 hover:shadow-lg group-hover:scale-105"
                                title="Undo last action for this floor"
                              >
                                <Undo2 className="w-5 h-5" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Notification Snackbar */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-50 max-w-md ${
              notification.type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : 
              notification.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : 
              notification.type === 'warning' ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white' : 
              'bg-gradient-to-r from-gray-800 to-gray-900 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium flex-1">{notification.message}</p>
              {notification.showUndo && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={notification.undoAction}
                  className="ml-4 flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-all duration-200"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-gray-200"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {showConfirmDialog.title}
                  </h3>
                </div>
              </div>
              <p className="mb-8 text-gray-600 leading-relaxed">
                {showConfirmDialog.message}
              </p>
              <div className="flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={showConfirmDialog.onCancel}
                  className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 text-gray-700"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={showConfirmDialog.onConfirm}
                  className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                >
                  Confirm
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Actions Panel */}
      <AnimatePresence>
        {actionHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-8 left-8 bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-sm z-40 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                <Clock className="w-5 h-5 text-gray-600" />
                Recent Actions
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <AnimatePresence>
                {actionHistory.slice(0, 5).map((action, index) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ backgroundColor: '#f8fafc' }}
                    className="p-4 border-b border-gray-50 last:border-b-0 flex items-center justify-between transition-colors duration-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {action.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => undoAction(action.id)}
                      className="p-2 text-orange-500 rounded-lg hover:bg-orange-50 transition-all duration-200"
                      title="Undo this action"
                    >
                      <Undo2 className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RMIScheduler;
