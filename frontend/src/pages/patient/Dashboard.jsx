import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { DoctorCard } from '../../components/Cards';
import EmergencyBanner from '../../components/Cards';
import { toast } from 'react-hot-toast';
import { Search, RefreshCw, Clock, Users, Activity, Filter, Bell } from 'lucide-react';
import { useRef } from 'react';

const PatientDashboard = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [notificationTime, setNotificationTime] = useState(10);
  const hasNotified = useRef(false);

  // Request Notification Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Get emergency status
  const { data: emergencyData } = useQuery({
    queryKey: ['emergency'],
    queryFn: () => api.get('/emergency').then(res => res.data.data.status),
    refetchInterval: 30000
  });

  // Get patient's queue status
  const { data: queueData, refetch: refetchQueue } = useQuery({
    queryKey: ['patientQueue'],
    queryFn: () => api.get('/queue/my-status').then(res => res.data.data),
    retry: false
  });

  // Get doctors
  const { data: doctorsData, isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get('/doctors').then(res => res.data.data),
  });

  const cancelQueueMutation = useMutation({
    mutationFn: (queueId) => api.patch(`/queue/cancel/${queueId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['patientQueue']);
      toast.success('Removed from queue');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel')
  });

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('queueUpdated', () => {
      queryClient.invalidateQueries(['patientQueue']);
      queryClient.invalidateQueries(['doctors']);
    });

    socket.on('emergencyStatusUpdated', () => {
      queryClient.invalidateQueries(['emergency']);
    });

    return () => {
      socket.off('queueUpdated');
      socket.off('emergencyStatusUpdated');
    };
  }, [queryClient]);

  // Filter doctors
  const filteredDoctors = doctorsData?.doctors?.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'All' || doctor.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  }) || [];

  // Smart Notification Logic
  useEffect(() => {
    if (!queueData?.entry?.eta || hasNotified.current) return;

    const minEta = queueData.entry.eta.min;
    if (minEta <= notificationTime) {
      if (Notification.permission === 'granted') {
        new Notification("It's almost your turn!", {
          body: `Dr. ${queueData.entry.doctorId?.name} will be ready for you in approx ${minEta} mins. Please head to the clinic.`,
          icon: '/vite.svg'
        });
        hasNotified.current = true;
        toast.success("Notification sent: It's almost time!");
      } else if (Notification.permission !== 'denied') {
         Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
               new Notification("It's almost your turn!", {
                  body: `Dr. ${queueData.entry.doctorId?.name} will be ready for you in approx ${minEta} mins.`,
               });
               hasNotified.current = true;
            }
         });
      }
    }
  }, [queueData, notificationTime]);

  // Get unique departments
  const departments = ['All', ...new Set(doctorsData?.doctors?.map(d => d.department) || [])];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Patient Dashboard</h1>
        <p className="page-subtitle">View available doctors and manage your queue status</p>
      </div>

      {/* Emergency Banner */}
      {emergencyData && emergencyData.status !== 'normal' && (
        <EmergencyBanner status={emergencyData} />
      )}

      {/* Queue Status */}
      {queueData?.entry ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">You're in Queue</h3>
                <p className="text-sm text-gray-600">Dr. {queueData.entry.doctorId?.name}</p>
              </div>
            </div>
            <button
              onClick={() => cancelQueueMutation.mutate(queueData.entry._id)}
              className="btn btn-danger btn-sm"
              disabled={cancelQueueMutation.isPending}
            >
              Leave Queue
            </button>
          </div>

          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {queueData.entry.status === 'serving' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-pulse">
                <div className="flex justify-center mb-3">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Activity className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">It's Your Turn!</h3>
                <p className="text-green-700">
                  You are being called. Please proceed to Dr. {queueData.entry.doctorId?.name}'s room immediately.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Your Position</div>
                  <div className="flex items-center gap-2">
                    <div className="queue-position-badge">
                      #{queueData.entry.queueNumber}
                    </div>
                    <span className="text-lg font-bold text-gray-900 absolute opacity-0">{queueData.entry.position}</span>
                    <span className="text-lg font-bold text-gray-900">
                      {queueData.entry.position > 0 ? queueData.entry.position : '-'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">People Ahead</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span className="text-lg font-bold text-gray-900">
                      {queueData.entry.position > 1 ? queueData.entry.position - 1 : 0}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Estimated Wait</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <span className="text-lg font-bold text-gray-900">
                      {queueData.entry.eta?.min || 0}-{queueData.entry.eta?.max || 0} min
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Bell className="h-4 w-4 text-purple-600" />
                   <span className="text-sm font-medium text-gray-700">Smart Notification</span>
                </div>
                <div className="flex items-center gap-2">
                   <label className="text-sm text-gray-600">Notify me</label>
                   <select 
                      className="text-sm border rounded px-2 py-1 bg-white"
                      value={notificationTime}
                      onChange={(e) => setNotificationTime(Number(e.target.value))}
                   >
                      <option value="5">5 mins before</option>
                      <option value="10">10 mins before</option>
                      <option value="15">15 mins before</option>
                      <option value="30">30 mins before</option>
                   </select>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Not in Queue</h3>
          <p className="text-sm text-gray-600">Select a doctor below to join the queue</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Doctors</h3>
          <button onClick={() => queryClient.invalidateQueries(['doctors'])} className="btn-icon">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by doctor name or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field input-search"
          />
        </div>

        {/* Department Filters */}
        <div className="filter-bar">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Department:</span>
          </div>
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setDepartmentFilter(dept)}
              className={`filter-btn ${departmentFilter === dept ? 'active' : ''}`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Doctors Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading doctors...</p>
          </div>
        ) : filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {filteredDoctors.map((doctor) => (
              <DoctorCard
                key={doctor._id}
                doctor={doctor}
                onJoinQueue={(doctorId) => {
                  // Join queue mutation is handled inside DoctorCard
                }}
                inQueue={queueData?.entry?.doctorId?._id === doctor._id}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h3 className="empty-state-title">No Doctors Found</h3>
            <p className="empty-state-description">
              {searchTerm || departmentFilter !== 'All'
                ? 'Try adjusting your search or filters'
                : 'No doctors available at the moment'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
