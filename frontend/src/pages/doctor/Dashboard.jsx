import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
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
  Activity
} from 'lucide-react';
import EmergencyBanner from '../../components/Cards';

const DoctorDashboard = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = useAuth();

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
  
  if (user?.status === 'pending') {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
           <div className="bg-yellow-100 p-6 rounded-full mb-6 relative">
              <Clock className="h-12 w-12 text-yellow-600" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                 <UserCheck className="h-6 w-6 text-purple-600" />
              </div>
           </div>
           <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
           <p className="text-gray-600 max-w-md">
              Thank you for registering, Dr. {user.name}.
              <br/>
              Your account is currently awaiting administrator approval. You will be able to access the dashboard once your account is verified.
           </p>
       </div>
     );
  }

  // Get Doctor Profile
  const { data: doctorProfile, isLoading: loadingProfile, error: errorProfile } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: () => api.get('/doctors/me').then(res => res.data.data.doctor),
    retry: 1
  });

  const doctorId = doctorProfile?._id;

  // Get Queue
  const { data: queueData, isLoading: loadingQueue } = useQuery({
    queryKey: ['myQueue', doctorId],
    queryFn: () => api.get(`/queue/doctor/${doctorId}`).then(res => res.data.data),
    enabled: !!doctorId,
    refetchInterval: 5000
  });

  // ... (keep mutations same)



  // Get Emergency Status
  const { data: emergencyData } = useQuery({
    queryKey: ['emergency'],
    queryFn: () => api.get('/emergency').then(res => res.data.data.status),
  });

  // Mutations
  const toggleSessionMutation = useMutation({
    mutationFn: () => api.patch(`/doctors/${doctorId}/toggle-session`),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctorProfile']);
      toast.success(doctorProfile?.isActive ? 'Session paused' : 'Session started');
    },
    onError: () => toast.error('Failed to update session')
  });

  const callNextMutation = useMutation({
    mutationFn: () => api.patch(`/queue/call-next/${doctorId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['myQueue']);
      toast.success('Called next patient');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const servePatientMutation = useMutation({
    mutationFn: (queueId) => api.patch(`/queue/serve/${queueId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['myQueue']);
      toast.success('Patient marked as served');
    },
    onError: () => toast.error('Failed to serve patient')
  });

  const skipPatientMutation = useMutation({
    mutationFn: (queueId) => api.patch(`/queue/skip/${queueId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['myQueue']);
      toast.success('Patient skipped');
    },
    onError: () => toast.error('Failed to skip patient')
  });

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('queueUpdated', () => {
      queryClient.invalidateQueries(['myQueue']);
    });

    socket.on('emergencyStatusUpdated', () => {
        queryClient.invalidateQueries(['emergency']);
    });

    return () => {
      socket.off('queueUpdated');
      socket.off('emergencyStatusUpdated');
    };
  }, [queryClient]);

  if (loadingProfile) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600">Loading doctor profile...</p>
    </div>
  );

  if (errorProfile || !doctorProfile) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 bg-red-50 rounded-full mb-4">
        <UserX className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Profile Load Failed</h3>
      <p className="text-gray-600 mb-4 max-w-md">
        Could not load your doctor profile. Please ensure the <b>Backend Server has been restarted</b> to apply the latest updates.
      </p>
      <button 
        onClick={() => {
           window.location.reload();
        }}
        className="btn btn-primary"
      >
        Retry
      </button>
    </div>
  );

  const currentPatient = queueData?.queue?.find(entry => entry.status === 'serving' || entry.status === 'called');
  const waitingPatients = queueData?.queue?.filter(entry => entry.status === 'waiting') || [];

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Doctor Dashboard</h1>
          <p className="page-subtitle">Welcome, Dr. {doctorProfile?.name}</p>
        </div>
        
        {/* Session Toggle */}
        <button
          onClick={() => toggleSessionMutation.mutate()}
          className={`btn ${doctorProfile?.isActive ? 'btn-danger' : 'btn-success'} gap-2`}
          disabled={toggleSessionMutation.isPending}
        >
          {doctorProfile?.isActive ? (
            <><Pause className="h-5 w-5" /> Go Offline</>
          ) : (
            <><Play className="h-5 w-5" /> Go Online</>
          )}
        </button>
      </div>

       {/* Emergency Status */}
       {emergencyData && emergencyData.status !== 'normal' && (
        <EmergencyBanner status={emergencyData} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Current Patient Action Area */}
        <div id="current" className="lg:col-span-2 space-y-6">
            
            {/* Current Patient Card */}
            <div className="card bg-gradient-to-br from-white to-purple-50 border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Activity className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Current Patient</h3>
                </div>

                {currentPatient ? (
                    <div className="text-center py-6">
                        <div className="w-20 h-20 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-purple-700">
                                #{currentPatient.queueNumber}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{currentPatient.patientId?.name}</h2>
                        <p className="text-gray-500 mb-6">{currentPatient.patientId?.email}</p>
                        
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => servePatientMutation.mutate(currentPatient._id)}
                                className="btn btn-success gap-2 px-8"
                            >
                                <CheckCircle className="h-5 w-5" />
                                Mark Completed
                            </button>
                            <button 
                                onClick={() => skipPatientMutation.mutate(currentPatient._id)}
                                className="btn btn-secondary gap-2"
                            >
                                <UserX className="h-5 w-5" />
                                Skip
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <UserCheck className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No patient currently being served.</p>
                        {waitingPatients.length > 0 && doctorProfile?.isActive && (
                            <button 
                                onClick={() => callNextMutation.mutate()}
                                className="btn btn-primary mt-4 gap-2"
                            >
                                <Users className="h-5 w-5" />
                                Call Next Patient
                            </button>
                        )}
                    </div>
                )}
            </div>

             {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-full">
                        <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Waiting</p>
                        <p className="text-xl font-bold text-gray-900">{waitingPatients.length}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-full">
                        <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Avg Time</p>
                        <p className="text-xl font-bold text-gray-900">{doctorProfile?.avgConsultationTime} min</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Queue List */}
        <div id="queue" className="lg:col-span-1">
            <div className="card h-full">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    Waiting Queue
                </h3>
                
                {waitingPatients.length > 0 ? (
                    <div className="space-y-3">
                        {waitingPatients.map((entry) => (
                            <div key={entry._id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            <span className="inline-block w-6 text-purple-600 font-bold">#{entry.queueNumber}</span>
                                            {entry.patientId?.name}
                                        </div>
                                        <div className="text-xs text-gray-500 ml-6">
                                            Since {new Date(entry.joinedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                    <span className="badge badge-yellow text-xs">Waiting</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        Queue is empty
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboard;
