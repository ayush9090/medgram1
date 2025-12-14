import React, { useState } from 'react';
import { ApiService } from '../services/api.ts';
import { User, UserRole } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login State
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Signup State
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [npiNumber, setNpiNumber] = useState('');
  const [stateLicense, setStateLicense] = useState('');
  const [userType, setUserType] = useState<'STUDENT' | 'OTHER' | 'PROFESSIONAL'>('PROFESSIONAL');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Real API Call
      const user = await ApiService.login(loginId, loginPass); 
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      
      try {
        const user = await ApiService.register({
            username: handle,
            email: handle.includes('@') ? handle : undefined,
            phone: handle.includes('@') ? undefined : handle,
            password: password,
            fullName: `${firstName} ${lastName}`,
            role: role,
            npiNumber: npiNumber || undefined,
            stateLicense: stateLicense || undefined,
            userType: userType
        });
        onLogin(user);
      } catch(err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-y-auto">
      {/* Header - Matching PDF Design */}
      <div className="bg-white p-8 text-center pb-12">
         <h1 className="text-3xl font-bold tracking-tight text-gray-900">MedGram</h1>
         <p className="text-gray-600 text-sm mt-2">Medical Education Community</p>
      </div>

      <div className="flex-1 bg-white px-6 pt-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
            <button 
                onClick={() => setActiveTab('login')}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${activeTab === 'login' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400'}`}
            >
                LOGIN
            </button>
            <button 
                onClick={() => setActiveTab('signup')}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${activeTab === 'signup' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400'}`}
            >
                SIGN UP
            </button>
        </div>

        {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">USER ID (EMAIL OR PHONE)</label>
                    <input 
                        type="text" 
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        placeholder="doctor@example.com"
                        className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-base focus:border-gray-900 focus:ring-0 outline-none transition-colors"
                        required
                    />
                </div>
                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">PASSWORD</label>
                    <input 
                        type="password" 
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-base focus:border-gray-900 focus:ring-0 outline-none transition-colors"
                        required
                    />
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  If 2FA is enabled, you will be asked for a code next.
                </p>
                
                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold text-base mt-6 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        ) : (
            <form onSubmit={handleSignup} className="space-y-6 pb-10">
                {/* Account Type */}
                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">ACCOUNT TYPE</label>
                    <div className="flex gap-2 bg-gray-100 p-1.5 rounded-lg">
                        {[
                            { l: 'Moderator', v: UserRole.MODERATOR },
                            { l: 'Creator', v: UserRole.CREATOR },
                            { l: 'User', v: UserRole.USER },
                        ].map((opt) => (
                            <button
                                key={opt.v}
                                type="button"
                                onClick={() => setRole(opt.v)}
                                className={`flex-1 py-2.5 text-xs font-semibold rounded-md transition-all ${role === opt.v ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600'}`}
                            >
                                {opt.l}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">FIRST NAME</label>
                        <input 
                            type="text" 
                            value={firstName} 
                            onChange={e => setFirstName(e.target.value)} 
                            className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-base focus:border-gray-900 focus:ring-0 outline-none transition-colors" 
                            required
                        />
                    </div>
                    <div className="flex-1">
                         <label className="text-sm font-semibold text-gray-700 mb-2 block">LAST NAME</label>
                         <input 
                             type="text" 
                             value={lastName} 
                             onChange={e => setLastName(e.target.value)} 
                             className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-base focus:border-gray-900 focus:ring-0 outline-none transition-colors" 
                             required
                         />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">EMAIL OR PHONE</label>
                    <input 
                        type="text" 
                        value={handle} 
                        onChange={e => setHandle(e.target.value)} 
                        placeholder="doctor@example.com or +1234567890"
                        className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-base focus:border-gray-900 focus:ring-0 outline-none transition-colors" 
                        required
                    />
                </div>
                
                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">PASSWORD</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="Create a strong password"
                        className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-base focus:border-gray-900 focus:ring-0 outline-none transition-colors" 
                        required
                    />
                </div>
                
                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">USER TYPE</label>
                    <div className="flex gap-2 bg-gray-100 p-1.5 rounded-lg">
                        {[
                            { l: 'Professional', v: 'PROFESSIONAL' },
                            { l: 'Student', v: 'STUDENT' },
                            { l: 'Other', v: 'OTHER' },
                        ].map((opt) => (
                            <button
                                key={opt.v}
                                type="button"
                                onClick={() => setUserType(opt.v as any)}
                                className={`flex-1 py-2.5 text-xs font-semibold rounded-md transition-all ${userType === opt.v ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600'}`}
                            >
                                {opt.l}
                            </button>
                        ))}
                    </div>
                </div>

                {userType === 'PROFESSIONAL' && (
                    <>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">NPI NUMBER <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                value={npiNumber}
                                onChange={e => setNpiNumber(e.target.value)}
                                placeholder="Enter NPI number"
                                className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-base focus:border-gray-900 focus:ring-0 outline-none transition-colors" 
                                required={userType === 'PROFESSIONAL'}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">STATE LICENSE (Alternative to NPI)</label>
                            <input 
                                type="text" 
                                value={stateLicense}
                                onChange={e => setStateLicense(e.target.value)}
                                placeholder="Enter State License number"
                                className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-base focus:border-gray-900 focus:ring-0 outline-none transition-colors" 
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Verification via NPI number or State License is required for professionals.
                        </p>
                    </>
                )}
                
                {userType !== 'PROFESSIONAL' && (
                    <p className="text-xs text-gray-500 mt-2">
                      Students and "others" do not require NPI or State License verification.
                    </p>
                )}
                
                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold text-base mt-6 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Registering...' : 'Complete Registration'}
                </button>
            </form>
        )}
      </div>
    </div>
  );
};