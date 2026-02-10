import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to access your dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label-field">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-11"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        <div>
          <label className="label-field">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-11"
              placeholder="Enter your password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full group"
        >
          <span>{loading ? 'Signing in...' : 'Sign in'}</span>
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }}></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">or</span>
        </div>
      </div>

      <div className="text-center">
        <span className="text-sm text-gray-600">Don't have an account? </span>
        <Link to="/register" className="text-sm font-medium text-purple-600 hover:text-purple-700">
          Create account
        </Link>
      </div>

      <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
        <p className="text-xs font-medium text-gray-700 mb-2">Demo Accounts:</p>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Patient:</span>
            <code className="text-purple-600">patient1@test.com</code>
          </div>
          <div className="flex justify-between">
            <span>Staff:</span>
            <code className="text-purple-600">staff@queueless.com</code>
          </div>
          <div className="flex justify-between">
            <span>Admin:</span>
            <code className="text-purple-600">admin@queueless.com</code>
          </div>
          <div className="flex justify-between">
            <span>Doctor:</span>
            <code className="text-purple-600">dr.anil.kumar@hospital.com</code>
          </div>
          <div className="text-center mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <span className="italic">Passwords: </span>
            <code className="font-semibold text-purple-600">patient123 / admin123 / doctor123</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
