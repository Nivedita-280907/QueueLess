import { AlertTriangle, Info, XCircle, Clock, Users, UserPlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Emergency Banner Component
const EmergencyBanner = ({ status }) => {
  if (!status || status.status === 'normal') return null;

  const getStatusConfig = (s) => {
    switch (s) {
      case 'alert':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: <Info className="h-5 w-5 text-yellow-600" />,
          label: 'ALERT'
        };
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          label: 'CRITICAL'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: <AlertTriangle className="h-5 w-5 text-gray-600" />,
          label: 'UNKNOWN'
        };
    }
  };

  const config = getStatusConfig(status.status);

  return (
    <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${config.bg} ${config.border} ${config.text}`}>
      <div className="flex-shrink-0 mt-0.5">
        {config.icon}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold">
          Emergency Ward Status: <span className="font-bold">{config.label}</span>
        </h3>
        {status.notes && <p className="mt-1 text-sm opacity-90">{status.notes}</p>}
        <div className="mt-2 text-xs opacity-75">
          Last updated: {status.lastUpdatedAt ? new Date(status.lastUpdatedAt).toLocaleTimeString() : 'Unknown'}
          <span className="block mt-1 font-medium">
            * Informational only. For medical emergencies, please approach the desk immediately.
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmergencyBanner;

// Doctor Card Component
export const DoctorCard = ({ doctor, inQueue }) => {
  const queryClient = useQueryClient();
  
  const joinQueueMutation = useMutation({
    mutationFn: (doctorId) => api.post('/queue/join', { doctorId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['patientQueue']);
      queryClient.invalidateQueries(['doctors']);
      toast.success('Joined queue successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to join queue')
  });

  const { name, department, isActive, avgConsultationTime, queueCount } = doctor;

  return (
    <div className="doctor-card">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600 mt-1">{department}</p>
        </div>
        <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>
          {isActive ? 'Active' : 'Offline'}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{avgConsultationTime} min</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{queueCount || 0} waiting</span>
        </div>
      </div>

      <button
        onClick={() => joinQueueMutation.mutate(doctor._id)}
        disabled={!isActive || inQueue || joinQueueMutation.isPending}
        className={`w-full btn ${
          inQueue 
            ? 'btn-secondary cursor-not-allowed' 
            : isActive 
              ? 'btn-accent' 
              : 'btn-secondary cursor-not-allowed'
        }`}
      >
        {joinQueueMutation.isPending ? (
          <>
            <div className="spinner mr-2"></div>
            Joining...
          </>
        ) : inQueue ? (
          'Already in Queue'
        ) : isActive ? (
          <>
            <UserPlus className="h-4 w-4 mr-2" />
            Join Queue
          </>
        ) : (
          'Session Not Started'
        )}
      </button>
    </div>
  );
};
