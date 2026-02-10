import { Outlet, Link } from 'react-router-dom';
import { Activity, Heart } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between p-12 bg-gradient-to-br from-purple-600 via-purple-500 to-blue-500">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Activity className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold">QueueLess</span>
          </Link>
        </div>
        
        <div className="space-y-6 text-white">
          <h2 className="text-4xl font-bold leading-tight">
            Smart OPD Queue<br />Management System
          </h2>
          <p className="text-lg text-purple-100">
            Reduce waiting times, improve patient experience, and streamline hospital operations with real-time queue management.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/20">
            <div>
              <div className="text-3xl font-bold">100+</div>
              <div className="text-sm text-purple-100">Patients Served Daily</div>
            </div>
            <div>
              <div className="text-3xl font-bold">50%</div>
              <div className="text-sm text-purple-100">Time Saved</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Heart className="h-4 w-4" />
          <span>Built for better healthcare</span>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">QueueLess</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-8" style={{ borderColor: 'var(--color-border)' }}>
            <Outlet />
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
