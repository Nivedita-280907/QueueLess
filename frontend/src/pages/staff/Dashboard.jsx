import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Clock, 
  Play, 
  Pause,
  UserCheck,
  UserX,
  CheckCircle,
  Megaphone,
  Search,
  Filter
} from 'lucide-react';
import EmergencyBanner from '../../components/Cards';

const StaffDashboard = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [selectedDoctor, setSelectedDoctor] = useState('');

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);
  const [emergencyNote, setEmergencyNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Get emergency status
  const { data: emergencyData } = useQuery({
    queryKey: ['emergency'],
    queryFn: () => api.get('/emergency').then(res => res.data.data.status),
  });

  // Get doctors
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get('/doctors').then(res => res.data.data),
  });

  // Get queue for selected doctor
  const { data: queueData } = useQuery({
    queryKey: ['doctorQueue', selectedDoctor],
    queryFn: () => api.get(`/queue/doctor/${selectedDoctor}`).then(res => res.data.data),
    enabled: !!selectedDoctor,
    refetchInterval: 10000
  });

  // Mutations
  const toggleSessionMutation = useMutation({
    mutationFn: (doctorId) => api.patch(`/doctors/${doctorId}/toggle-session`),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctors']);
      toast.success('Session status updated');
    },
    onError: () => toast.error('Failed to update session')
  });

  const callNextMutation = useMutation({
    mutationFn: (doctorId) => api.patch(`/queue/call-next/${doctorId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorQueue']);
      toast.success('Next patient called');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const servePatientMutation = useMutation({
    mutationFn: (queueId) => api.patch(`/queue/serve/${queueId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorQueue']);
      toast.success('Patient marked as served');
    },
    onError: () => toast.error('Failed to serve patient')
  });

  const skipPatientMutation = useMutation({
    mutationFn: (queueId) => api.patch(`/queue/skip/${queueId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorQueue']);
      toast.success('Patient skipped');
    },
    onError: () => toast.error('Failed to skip patient')
  });

  const updateEmergencyMutation = useMutation({
    mutationFn: (status) => api.post('/emergency', { status, notes: emergencyNote }),
    onSuccess: () => {
      queryClient.invalidateQueries(['emergency']);
      setEmergencyNote('');
      toast.success('Emergency status updated');
    },
    onError: () => toast.error('Failed to update emergency status')
  });

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('queueUpdated', () => {
      queryClient.invalidateQueries(['doctorQueue']);
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

  // Set first doctor as default
  useEffect(() => {
    if (!selectedDoctor && doctorsData?.doctors?.length > 0) {
      setSelectedDoctor(doctorsData.doctors[0]._id);
    }
  }, [doctorsData, selectedDoctor]);

  // Filter queue entries
  const filteredQueue = queueData?.queue?.filter(entry => {
    const matchesSearch = entry.patientId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.patientId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || entry.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  }) || [];

  const statuses = ['All', 'Waiting', 'Called', 'Serving'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Staff Dashboard</h1>
        <p className="page-subtitle">Manage doctor sessions and patient queues</p>
      </div>

      {/* Emergency Status */}
      {emergencyData && emergencyData.status !== 'normal' && (
        <EmergencyBanner status={emergencyData} />
      )}

      {/* Emergency Control */}
      <div id="emergency" className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-gray-600" />
            <h3 className="card-title">Emergency Status Control</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-field">Current Status</label>
            <div className="flex items-center gap-2">
              <span className={`badge ${
                emergencyData?.status === 'normal' ? 'badge-green' :
                emergencyData?.status === 'alert' ? 'badge-yellow' : 'badge-red'
              }`}>
                {emergencyData?.status ? String(emergencyData.status).toUpperCase() : 'NORMAL'}
              </span>
              <span className="text-sm text-gray-600">
                Last updated: {emergencyData?.lastUpdatedAt ? new Date(emergencyData.lastUpdatedAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>

          <div>
            <label className="label-field">Update Status</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add note (optional)"
                value={emergencyNote}
                onChange={(e) => setEmergencyNote(e.target.value)}
                className="input-field flex-1"
              />
              <button
                onClick={() => updateEmergencyMutation.mutate('normal')}
                className="btn btn-success"
                disabled={updateEmergencyMutation.isPending}
              >
                Normal
              </button>
              <button
                onClick={() => updateEmergencyMutation.mutate('alert')}
                className="btn btn-secondary"
                disabled={updateEmergencyMutation.isPending}
                style={{ backgroundColor: '#fef3c7', borderColor: '#fbbf24', color: '#78350f' }}
              >
                Alert
              </button>
              <button
                onClick={() => updateEmergencyMutation.mutate('critical')}
                className="btn btn-danger"
                disabled={updateEmergencyMutation.isPending}
              >
                Critical
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Session Management */}
      <div id="doctors" className="card">
        <div className="card-header">
          <h3 className="card-title">Doctor Sessions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctorsData?.doctors?.map((doctor) => (
            <div
              key={doctor._id}
              className={`doctor-card ${selectedDoctor === doctor._id ? 'ring-2 ring-purple-500' : ''}`}
              onClick={() => setSelectedDoctor(doctor._id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{doctor.name}</h4>
                  <p className="text-sm text-gray-600">{doctor.department}</p>
                </div>
                <div className={`badge ${doctor.isActive ? 'badge-green' : 'badge-secondary'}`}>
                  {doctor.isActive ? (
                    <><Pause className="h-3 w-3 mr-1" /> Active</>
                  ) : (
                    <><Play className="h-3 w-3 mr-1" /> Inactive</>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{doctor.queueCount || 0} waiting</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{doctor.avgConsultationTime} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue Management */}
      {selectedDoctor && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                Queue: Dr. {doctorsData?.doctors?.find(d => d._id === selectedDoctor)?.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {queueData?.queue?.length || 0} patients in queue
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field input-search"
              />
            </div>

            <div className="filter-bar">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Status:</span>
              </div>
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Table */}
          {filteredQueue.length > 0 ? (
            <div className="table-container mt-6">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Position</th>
                    <th className="table-header-cell">Patient</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((entry, index) => (
                    <tr key={entry._id} className="table-row">
                      <td className="table-cell">
                        <div className="queue-position-badge">
                          #{entry.queueNumber}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium">{entry.patientId?.name}</div>
                          <div className="text-sm text-gray-500">{entry.patientId?.email}</div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${
                          entry.status === 'waiting' ? 'badge-yellow' :
                          entry.status === 'called' ? 'badge-blue' :
                          entry.status === 'serving' ? 'badge-purple' :
                          entry.status === 'served' ? 'badge-green' : 'badge-gray'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600">
                          {new Date(entry.joinedAt).toLocaleTimeString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Users className="empty-state-icon" />
              <h3 className="empty-state-title">No Patients in Queue</h3>
              <p className="empty-state-description">
                {searchTerm || statusFilter !== 'All'
                  ? 'No patients match your search criteria'
                  : 'The queue is currently empty'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
