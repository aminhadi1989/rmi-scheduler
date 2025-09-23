<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Manchester Grand Hyatt RMI Scheduler</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter Tight', 'sans-serif']
          },
          colors: {
            primary: '#222',
            accent: '#FA5D29',
            success: '#16a34a',
            gray: {
              500: '#6d6e71',
              900: '#111827'
            }
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    .font-light { font-variation-settings: 'wght' 300; }
    .font-normal { font-variation-settings: 'wght' 400; }
    .font-medium { font-variation-settings: 'wght' 500; }
    .animate-pulse-slow { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body class="bg-white min-h-screen font-sans" style="font-variation-settings: 'wght' 400;">
  <div id="root"></div>

  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom": "https://esm.sh/react-dom@18.2.0",
        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
        "lucide-react": "https://esm.sh/lucide-react@0.300.0"
      }
    }
  </script>

  <script type="module">
    import { useState, useEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import {
      Calendar, Bell, CheckCircle, Clock, Building, Search, Filter,
      ChevronDown, Undo2, AlertTriangle
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
          'overdue': 'bg-red-600 text-white',
          'due-soon': 'bg-orange-500 text-white',
          'scheduled': 'bg-green-600 text-white',
          'unscheduled': 'bg-gray-400 text-white'
        };
        
        const labels = {
          'overdue': 'Overdue',
          'due-soon': 'Due Soon',
          'scheduled': 'Scheduled',
          'unscheduled': 'Not Scheduled'
        };
        
        return (
          React.createElement('span', {
            className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${badges[status]} ${status === 'overdue' || status === 'due-soon' ? 'animate-pulse-slow' : ''}`
          }, labels[status])
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

      return React.createElement('div', { className: "min-h-screen bg-white" },
        // Header
        React.createElement('header', { className: "sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50 transition-all duration-300" },
          React.createElement('div', { className: "max-w-screen-2xl mx-auto px-6 py-8" },
            React.createElement('div', { className: "flex items-center justify-between" },
              React.createElement('div', { className: "flex items-center gap-6" },
                React.createElement('div', { className: "w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm" },
                  React.createElement(Building, { className: "w-6 h-6 text-white" })
                ),
                React.createElement('div', null,
                  React.createElement('h1', { 
                    className: "text-6xl font-light mb-2",
                    style: { 
                      fontSize: 'clamp(2.5rem, 8vw, 4rem)', 
                      fontVariationSettings: '"wght" 100',
                      lineHeight: '1.1',
                      color: '#222'
                    }
                  }, "Room Maintenance"),
                  React.createElement('p', { 
                    className: "text-xl",
                    style: { 
                      fontVariationSettings: '"wght" 300', 
                      lineHeight: '200%',
                      color: '#6d6e71'
                    }
                  }, "Manchester Grand Hyatt San Diego")
                )
              ),
              React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('div', { 
                  className: "text-sm text-gray-500",
                  style: { fontVariationSettings: '"wght" 400' }
                }, new Date().toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }))
              )
            )
          )
        ),

        React.createElement('main', { className: "max-w-screen-2xl mx-auto px-6 py-12", style: { background: '#f8f8f8' } },
          // Urgent Reminders
          upcomingReminders.length > 0 && React.createElement('section', { className: "mb-20" },
            React.createElement('h2', { 
              className: "text-4xl font-light mb-12",
              style: { fontVariationSettings: '"wght" 300', color: '#FA5D29' }
            }, "Urgent Reminders"),
            React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" },
              upcomingReminders.map((reminder, index) =>
                React.createElement('div', {
                  key: index,
                  className: "bg-white border-l-4 rounded-lg p-8 hover:shadow-xl transition-all duration-500 hover:-translate-y-2",
                  style: { borderLeftColor: '#FA5D29' }
                },
                  React.createElement('div', { className: "flex justify-between items-start mb-6" },
                    React.createElement('div', null,
                      React.createElement('h3', { 
                        className: "font-medium mb-2",
                        style: { fontVariationSettings: '"wght" 500', color: '#222', fontSize: '1.1rem' }
                      }, reminder.towerName),
                      React.createElement('p', { 
                        className: "text-3xl font-light",
                        style: { fontVariationSettings: '"wght" 200', color: '#6d6e71' }
                      }, "Floor ", reminder.floor)
                    ),
                    React.createElement('span', {
                      className: "text-white text-sm px-4 py-2 rounded-full font-medium animate-pulse-slow shadow-lg",
                      style: { backgroundColor: '#FA5D29' }
                    }, reminder.daysUntil === 0 ? 'Today' : `${reminder.daysUntil}d`)
                  ),
                  React.createElement('p', { 
                    className: "mb-6",
                    style: { lineHeight: '200%', color: '#6d6e71' }
                  }, "Due: ", formatDate(reminder.nextDate.toISOString().split('T')[0])),
                  React.createElement('button', {
                    onClick: () => markAsCompleted(reminder.towerId, reminder.floor),
                    className: "w-full text-white px-6 py-4 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-1",
                    style: { backgroundColor: '#222' }
                  }, "Mark Complete")
                )
              )
            )
          ),

          // Statistics Cards
          React.createElement('section', { className: "mb-20" },
            React.createElement('div', { className: "grid grid-cols-2 lg:grid-cols-4 gap-8" },
              React.createElement('div', { className: "bg-white rounded-lg p-8 text-center hover:shadow-lg transition-all duration-500 hover:-translate-y-1" },
                React.createElement('div', {
                  className: "bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg"
                }, stats.overdue),
                React.createElement('h3', { className: "text-lg font-medium", style: { color: '#6d6e71' } }, "Overdue")
              ),
              React.createElement('div', { className: "bg-white rounded-lg p-8 text-center hover:shadow-lg transition-all duration-500 hover:-translate-y-1" },
                React.createElement('div', {
                  className: "text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg",
                  style: { backgroundColor: '#FA5D29' }
                }, stats.dueSoon),
                React.createElement('h3', { className: "text-lg font-medium", style: { color: '#6d6e71' } }, "Due Soon")
              ),
              React.createElement('div', { className: "bg-white rounded-lg p-8 text-center hover:shadow-lg transition-all duration-500 hover:-translate-y-1" },
                React.createElement('div', {
                  className: "text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg",
                  style: { backgroundColor: '#16a34a' }
                }, stats.scheduled),
                React.createElement('h3', { className: "text-lg font-medium", style: { color: '#6d6e71' } }, "Scheduled")
              ),
              React.createElement('div', { className: "bg-white rounded-lg p-8 text-center hover:shadow-lg transition-all duration-500 hover:-translate-y-1" },
                React.createElement('div', {
                  className: "text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg",
                  style: { backgroundColor: '#6d6e71' }
                }, stats.unscheduled),
                React.createElement('h3', { className: "text-lg font-medium", style: { color: '#6d6e71' } }, "Unscheduled")
              )
            )
          ),

          // Controls
          React.createElement('section', { className: "mb-16" },
            React.createElement('div', { className: "flex flex-wrap gap-8 items-center justify-between" },
              // Tower Selection
              React.createElement('div', { className: "flex gap-4" },
                Object.keys(towers).map(towerId =>
                  React.createElement('button', {
                    key: towerId,
                    onClick: () => setSelectedTower(towerId),
                    className: `px-8 py-4 rounded-lg font-medium transition-all duration-300 hover:shadow-lg ${
                      selectedTower === towerId
                        ? 'bg-gray-900 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`,
                    style: { fontVariationSettings: '"wght" 500' }
                  }, towers[towerId].name)
                )
              ),

              // Search and Filters
              React.createElement('div', { className: "flex gap-6 items-center" },
                React.createElement('div', { className: "relative" },
                  React.createElement(Search, {
                    className: "absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5",
                    style: { color: '#6d6e71' }
                  }),
                  React.createElement('input', {
                    type: "text",
                    placeholder: "Search floors...",
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    className: "pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-300",
                    style: { color: '#6d6e71' }
                  })
                ),
                
                React.createElement('div', { className: "relative" },
                  React.createElement('button', {
                    onClick: () => setShowFilters(!showFilters),
                    className: "flex items-center gap-3 px-8 py-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-300",
                    style: { color: '#6d6e71' }
                  },
                    React.createElement(Filter, { className: "w-5 h-5" }),
                    "Filter",
                    React.createElement(ChevronDown, {
                      className: `w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`
                    })
                  ),
                  
                  showFilters && React.createElement('div', {
                    className: "absolute right-0 top-full mt-3 bg-white border border-gray-200 rounded-lg shadow-2xl z-10 min-w-48 overflow-hidden"
                  },
                    ['all', 'overdue', 'due-soon', 'scheduled', 'unscheduled'].map(filter =>
                      React.createElement('button', {
                        key: filter,
                        onClick: () => {
                          setStatusFilter(filter);
                          setShowFilters(false);
                        },
                        className: `w-full text-left px-6 py-4 hover:bg-gray-50 transition-all duration-300 ${
                          statusFilter === filter ? 'bg-gray-900 text-white' : ''
                        }`,
                        style: { color: statusFilter === filter ? 'white' : '#6d6e71' }
                      },
                        filter === 'all' ? 'All Floors' : 
                        filter === 'due-soon' ? 'Due Soon' :
                        filter.charAt(0).toUpperCase() + filter.slice(1)
                      )
                    )
                  )
                )
              )
            )
          ),

          // Floor Grid
          React.createElement('section', null,
            React.createElement('div', { className: "bg-white rounded-lg overflow-hidden shadow-sm" },
              React.createElement('div', { className: "p-10 border-b border-gray-100" },
                React.createElement('h2', { 
                  className: "text-3xl font-light mb-3",
                  style: { fontVariationSettings: '"wght" 300', color: '#222' }
                }, towers[selectedTower].name, " Schedule"),
                React.createElement('p', { 
                  className: "text-lg",
                  style: { lineHeight: '200%', color: '#6d6e71' }
                }, "Maintenance required every 3 months")
              ),

              React.createElement('div', { className: "overflow-x-auto" },
                React.createElement('table', { className: "w-full" },
                  React.createElement('thead', { className: "bg-gray-50" },
                    React.createElement('tr', null,
                      React.createElement('th', { 
                        className: "text-left px-10 py-6 text-sm font-medium uppercase tracking-wider",
                        style: { color: '#6d6e71' }
                      }, "Floor"),
                      React.createElement('th', { 
                        className: "text-left px-10 py-6 text-sm font-medium uppercase tracking-wider",
                        style: { color: '#6d6e71' }
                      }, "Last Maintenance"),
                      React.createElement('th', { 
                        className: "text-left px-10 py-6 text-sm font-medium uppercase tracking-wider",
                        style: { color: '#6d6e71' }
                      }, "Next Due"),
                      React.createElement('th', { 
                        className: "text-left px-10 py-6 text-sm font-medium uppercase tracking-wider",
                        style: { color: '#6d6e71' }
                      }, "Status"),
                      React.createElement('th', { 
                        className: "text-left px-10 py-6 text-sm font-medium uppercase tracking-wider",
                        style: { color: '#6d6e71' }
                      }, "Actions")
                    )
                  ),
                  React.createElement('tbody', { className: "bg-white divide-y divide-gray-100" },
                    filteredFloors.map(floor => {
                      const floorData = scheduleData[selectedTower]?.[floor] || {};
                      const status = getFloorStatus(floorData);
                      
                      return React.createElement('tr', {
                        key: floor,
                        className: "hover:bg-gray-50 transition-all duration-300"
                      },
                        React.createElement('td', { className: "px-10 py-8" },
                          React.createElement('span', {
                            className: "text-2xl font-light",
                            style: { fontVariationSettings: '"wght" 300', color: '#222' }
                          }, "Floor ", floor)
                        ),
                        React.createElement('td', { 
                          className: "px-10 py-8",
                          style: { color: '#6d6e71' }
                        }, formatDate(floorData.lastMaintenance)),
                        React.createElement('td', { 
                          className: "px-10 py-8",
                          style: { color: '#6d6e71' }
                        }, formatDate(floorData.nextMaintenance)),
                        React.createElement('td', { className: "px-10 py-8" },
                          getStatusBadge(status)
                        ),
                        React.createElement('td', { className: "px-10 py-8" },
                          React.createElement('div', { className: "flex gap-4 items-center" },
                            React.createElement('input', {
                              type: "date",
                              onChange: (e) => {
                                if (e.target.value) {
                                  addMaintenanceDate(selectedTower, floor, e.target.value);
                                }
                              },
                              className: "px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all duration-300",
                              style: { color: '#6d6e71' }
                            }),
                            React.createElement('button', {
                              onClick: () => markAsCompleted(selectedTower, floor),
                              className: "p-3 bg-gray-900 text-white rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg",
                              title: "Mark as completed today"
                            },
                              React.createElement(CheckCircle, { className: "w-5 h-5" })
                            ),
                            React.createElement('button', {
                              onClick: () => undoLastActionForFloor(selectedTower, floor),
                              className: "p-3 bg-gray-200 text-orange-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg",
                              title: "Undo last action for this floor"
                            },
                              React.createElement(Undo2, { className: "w-5 h-5" })
                            )
                          )
                        )
                      );
                    })
                  )
                )
              )
            )
          )
        ),

        // Notification Snackbar
        notification && React.createElement('div', {
          className: `fixed bottom-8 right-8 px-8 py-5 rounded-lg shadow-2xl transition-all duration-500 z-50 max-w-md ${
            notification.type === 'success' ? 'bg-gray-900 text-white' : 
            notification.type === 'error' ? 'bg-red-600 text-white' : 
            notification.type === 'warning' ? 'bg-orange-500 text-white' : 
            'text-white'
          }`,
          style: { 
            backgroundColor: notification.type === 'success' ? '#222' : 
                            notification.type === 'warning' ? '#FA5D29' : undefined
          }
        },
          React.createElement('div', { className: "flex items-center justify-between" },
            React.createElement('p', { className: "font-medium text-lg flex-1" }, notification.message),
            notification.showUndo && React.createElement('button', {
              onClick: notification.undoAction,
              className: "ml-4 flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-all duration-200"
            },
              React.createElement(Undo2, { className: "w-4 h-4" }),
              "Undo"
            )
          )
        ),

        // Confirmation Dialog
        showConfirmDialog && React.createElement('div', {
          className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        },
          React.createElement('div', { className: "bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl" },
            React.createElement('div', { className: "flex items-center gap-4 mb-6" },
              React.createElement('div', { className: "w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center" },
                React.createElement(AlertTriangle, { 
                  className: "w-6 h-6",
                  style: { color: '#FA5D29' }
                })
              ),
              React.createElement('div', null,
                React.createElement('h3', {
                  className: "text-xl font-medium",
                  style: { color: '#222' }
                }, showConfirmDialog.title)
              )
            ),
            React.createElement('p', {
              className: "mb-8 text-lg",
              style: { color: '#6d6e71', lineHeight: '200%' }
            }, showConfirmDialog.message),
            React.createElement('div', { className: "flex gap-4 justify-end" },
              React.createElement('button', {
                onClick: showConfirmDialog.onCancel,
                className: "px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all duration-300",
                style: { color: '#6d6e71' }
              }, "Cancel"),
              React.createElement('button', {
                onClick: showConfirmDialog.onConfirm,
                className: "px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300"
              }, "Confirm")
            )
          )
        ),

        // Recent Actions Panel
        actionHistory.length > 0 && React.createElement('div', {
          className: "fixed bottom-8 left-8 bg-white border border-gray-200 rounded-lg shadow-2xl max-w-sm z-40"
        },
          React.createElement('div', { className: "p-6 border-b border-gray-100" },
            React.createElement('h3', {
              className: "text-lg font-medium flex items-center gap-2",
              style: { color: '#222' }
            },
              React.createElement(Clock, { className: "w-5 h-5" }),
              "Recent Actions"
            )
          ),
          React.createElement('div', { className: "max-h-64 overflow-y-auto" },
            actionHistory.slice(0, 5).map(action =>
              React.createElement('div', {
                key: action.id,
                className: "p-4 border-b border-gray-50 last:border-b-0 flex items-center justify-between hover:bg-gray-50 transition-all duration-200"
              },
                React.createElement('div', null,
                  React.createElement('p', {
                    className: "text-sm font-medium",
                    style: { color: '#6d6e71' }
                  }, action.description),
                  React.createElement('p', {
                    className: "text-xs mt-1",
                    style: { color: '#6d6e71', opacity: 0.7 }
                  }, new Date(action.timestamp).toLocaleTimeString())
                ),
                React.createElement('button', {
                  onClick: () => undoAction(action.id),
                  className: "p-2 rounded-lg hover:bg-gray-100 transition-all duration-200",
                  style: { color: '#FA5D29' },
                  title: "Undo this action"
                },
                  React.createElement(Undo2, { className: "w-4 h-4" })
                )
              )
            )
          )
        )
      );
    };

    const root = createRoot(document.getElementById('root'));
    root.render(React.createElement(RMIScheduler));
  </script>
</body>
</html>
