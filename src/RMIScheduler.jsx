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
  const [dateInputs, setDateInputs] = useState({}); // Track date inputs for each floor

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
    // Set today's date in the date input immediately
    const today = new Date().toISOString().split('T')[0];
    setDateInputs(prev => ({
      ...prev,
      [`${towerId}-${floor}`]: today
    }));

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
      onCancel: () => {
        // Clear the date input if user cancels
        setDateInputs(prev => ({
          ...prev,
          [`${towerId}-${floor}`]: ''
        }));
        setShowConfirmDialog(null);
      }
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

  const resetFloorStatus = (towerId, floor) => {
    setShowConfirmDialog({
      title: 'Reset Floor Status',
      message: `Are you sure you want to reset Floor ${floor} maintenance status? This will clear all maintenance data for this floor.`,
      onConfirm: () => {
        const previousState = scheduleData[towerId]?.[floor] || { lastMaintenance: null, nextMaintenance: null, completed: false };
        
        const newState = {
          lastMaintenance: null,
          nextMaintenance: null,
          completed: false
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
          type: 'reset',
          towerId,
          floor,
          previousState,
          newState,
          description: `Reset maintenance status for Floor ${floor}`
        });

        // Highlight the affected row
        setHighlightedRow(`${towerId}-${floor}`);
        setTimeout(() => setHighlightedRow(null), 2000);

        showNotification(
          `Floor ${floor} status reset successfully!`, 
          'success', 
          true, 
          () => undoAction(actionId)
        );
        setShowConfirmDialog(null);
      },
      onCancel: () => setShowConfirmDialog(null)
    });
  };

  const getFilterLabel = () => {
    if (statusFilter === 'all') return 'Filter';
    if (statusFilter === 'due-soon') return 'Filter: Due Soon';
    return `Filter: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`;
  };

  return (
    // ... rest of your JSX (keep everything else the same)
  );
};

export default RMIScheduler;
