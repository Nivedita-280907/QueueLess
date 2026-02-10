import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import Input from '../../components/Input';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, Edit2, BarChart3, Users, CheckCircle, Search, TrendingUp, Clock } from 'lucide-react';

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: '', department: '', avgConsultationTime: 15 });
  const [searchTerm, setSearchTerm] = useState('');

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

  // Get Stats
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get('/queue/stats/today').then(res => res.data.data),
    refetchInterval: 30000
  });

  // Get Doctors
  const { data: doctorsData } = useQuery({
    queryKey: ['adminDoctors'],
    queryFn: () => api.get('/doctors').then(res => res.data.data),
  });

  // Calculate Department Stats
  const departmentStats = stats?.doctorStats?.reduce((acc, curr) => {
    const dept = curr.doctor.department;
    if (!acc[dept]) {
      acc[dept] = { department: dept, doctors: 0, waiting: 0, served: 0 };
    }
    acc[dept].doctors += 1;
    acc[dept].waiting += curr.waiting;
    acc[dept].served += curr.served;
    return acc;
  }, {});

  const departmentStatsArray = departmentStats ? Object.values(departmentStats) : [];

  const createDoctorMutation = useMutation({
    mutationFn: (data) => api.post('/doctors', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['adminDoctors']);
      setShowAddModal(false);
      setNewDoctor({ name: '', department: '', avgConsultationTime: 15 });
      
      const { email, password } = response.data.data.credentials;
      toast.success(
        <div>
          <b>Doctor Added!</b><br/>
          Login: {email}<br/>
          Password: {password}
        </div>, 
        { duration: 8000 }
      );
    },
    onError: (err) => toast.error('Failed to add doctor')
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: (id) => api.delete(`/doctors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminDoctors']);
      toast.success('Doctor removed');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove doctor')
  });

  // Filter doctors
  const filteredDoctors = doctorsData?.doctors?.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.department.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get Pending Applications
  const { data: pendingAppsData } = useQuery({
    queryKey: ['pendingApps'],
    queryFn: () => api.get('/doctors/applications?status=pending').then(res => res.data.data),
    refetchInterval: 10000 
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/doctors/applications/${id}`, { action: 'approve' }),
    onSuccess: () => {
       queryClient.invalidateQueries(['pendingApps']);
       queryClient.invalidateQueries(['adminDoctors']);
       toast.success('Doctor approved');
    },
    onError: () => toast.error('Failed to approve')
  });

  const pendingDoctors = pendingAppsData?.doctors || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage doctors and view system analytics</p>
      </div>

      {/* Pending Approvals */}
      {pendingDoctors.length > 0 && (
        <div className="card border-l-4 border-yellow-400 bg-yellow-50/30">
           <div className="card-header pb-2">
              <h3 className="card-title text-yellow-800 flex items-center gap-2">
                 <Clock className="h-5 w-5" />
                 Pending Approvals ({pendingDoctors.length})
              </h3>
           </div>
           
           <div className="space-y-3 mt-2">
              {pendingDoctors.map(doc => (
                 <div key={doc._id} className="flex items-center justify-between p-4 bg-white border border-yellow-100 rounded-xl shadow-sm">
                    <div>
                       <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{doc.name}</p>
                          <span className="badge badge-purple text-xs">{doc.department}</span>
                       </div>
                       <p className="text-sm text-gray-500 mt-1">{doc.userId?.email}</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                          onClick={() => approveMutation.mutate(doc._id)}
                          className="btn btn-success text-sm py-1.5 px-4"
                          disabled={approveMutation.isPending}
                       >
                          Approve Request
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value">{stats?.summary?.totalWaiting || 0}</div>
              <div className="stat-label">Waiting Patients</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-green-50 to-green-100/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value">{stats?.summary?.totalServed || 0}</div>
              <div className="stat-label">Served Today</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value">{doctorsData?.doctors?.filter(d => d.isActive).length || 0}</div>
              <div className="stat-label">Active Doctors</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-orange-50 to-orange-100/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-value">
                {stats?.summary?.avgWaitTime ? Math.round(stats.summary.avgWaitTime) : 0}m
              </div>
              <div className="stat-label">Avg Wait Time</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Management */}
      <div id="doctors" className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Doctor Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              {doctorsData?.doctors?.length || 0} total doctors registered
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Doctor
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search doctors by name or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field input-search"
          />
        </div>
        
        {/* Doctors Table */}
        {filteredDoctors.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Department</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Avg Time</th>
                  <th className="table-header-cell">Queue Count</th>
                  <th className="table-header-cell text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor._id} className="table-row">
                    <td className="table-cell">
                      <div className="font-medium text-gray-900">{doctor.name}</div>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-purple">{doctor.department}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${doctor.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {doctor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-600">{doctor.avgConsultationTime} min</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{doctor.queueCount || 0}</span>
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      <button 
                        onClick={() => {
                          if(window.confirm('Delete this doctor?')) deleteDoctorMutation.mutate(doctor._id)
                        }}
                        className="btn-icon text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h3 className="empty-state-title">No Doctors Found</h3>
            <p className="empty-state-description">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first doctor'}
            </p>
          </div>
        )}
      </div>

      {/* Department Analytics */}
      <div id="analytics" className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <h3 className="card-title">Department Analytics</h3>
          </div>
        </div>

        {departmentStatsArray.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentStatsArray.map((dept) => (
              <div key={dept.department} className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{dept.department}</h4>
                  <span className="badge badge-blue">{dept.doctors} doctors</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Waiting:</span>
                    <span className="font-medium">{dept.waiting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Served:</span>
                    <span className="font-medium text-green-600">{dept.served}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No analytics data available</p>
          </div>
        )}
      </div>

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-in">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Doctor</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              createDoctorMutation.mutate(newDoctor);
            }} className="space-y-5">
              <Input
                label="Doctor Name"
                value={newDoctor.name}
                onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                required
                placeholder="Dr. John Doe"
              />
              <Input
                label="Department"
                value={newDoctor.department}
                onChange={(e) => setNewDoctor({...newDoctor, department: e.target.value})}
                required
                placeholder="Cardiology"
              />
              <Input
                label="Average Consultation Time"
                type="number"
                value={newDoctor.avgConsultationTime}
                onChange={(e) => setNewDoctor({...newDoctor, avgConsultationTime: parseInt(e.target.value)})}
                required
                min="1"
                placeholder="15"
              />
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createDoctorMutation.isPending}
                >
                  {createDoctorMutation.isPending ? 'Adding...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
