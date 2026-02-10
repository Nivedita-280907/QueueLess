import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import { Mail, Lock, User as UserIcon, ArrowRight, Activity, Stethoscope } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [role, setRole] = useState('patient');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    
    if (role === 'doctor' && !formData.email.endsWith('@hospital.com')) {
       alert("Doctor email must end with @hospital.com");
       return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role,
        department: role === 'doctor' ? department : undefined
      });
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  const departments = [
    'General Medicine', 'Pediatrics', 'Orthopedics', 
    'Dermatology', 'ENT', 'Cardiology', 'Neurology'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create an account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Get started with QueueLess today
        </p>
      </div>

      <div className="bg-gray-100 p-1 rounded-lg flex mb-6">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'patient' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setRole('patient')}
          type="button"
        >
          Patient
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'doctor' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setRole('doctor')}
          type="button"
        >
          Doctor
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label-field">Full Name</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="input-field pl-11"
              placeholder={role === 'doctor' ? "Dr. John Doe" : "Enter your full name"}
              required
            />
          </div>
        </div>

        <div>
          <label className="label-field">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field pl-11"
              placeholder={role === 'doctor' ? "me@hospital.com" : "Enter your email"}
              required
            />
          </div>
          {role === 'doctor' && (
             <p className="text-xs text-gray-500 mt-1">Doctor email must end with @hospital.com</p>
          )}
        </div>

        {role === 'doctor' && (
          <div>
            <label className="label-field">Department</label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input-field pl-11 appearance-none bg-white"
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                   <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Password fields remain same but I need to include them in replacement */}
        <div>
          <label className="label-field">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field pl-11"
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>
        </div>

        <div>
          <label className="label-field">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field pl-11"
              placeholder="Confirm your password"
              required
              minLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full group"
        >
          <span>{loading ? 'Creating account...' : (role === 'doctor' ? 'Submit Application' : 'Create account')}</span>
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      <div className="text-center">
         <span className="text-sm text-gray-600">Already have an account? </span>
         <Link to="/login" className="text-sm font-medium text-purple-600 hover:text-purple-700">
            Sign in
         </Link>
      </div>
    </div>
  );
};

export default Register;
