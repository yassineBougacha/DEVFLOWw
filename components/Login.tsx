import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, UserCog, User, Fingerprint, ScanLine, Split, ExternalLink } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email);
    } catch (err) {
      setError('ACCESS DENIED: Credentials Invalid');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password'); 
  };

  const openNewSession = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Grid & Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(255,165,0,0.03)_25%,rgba(255,165,0,0.03)_26%,transparent_27%,transparent_74%,rgba(255,165,0,0.03)_75%,rgba(255,165,0,0.03)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,165,0,0.03)_25%,rgba(255,165,0,0.03)_26%,transparent_27%,transparent_74%,rgba(255,165,0,0.03)_75%,rgba(255,165,0,0.03)_76%,transparent_77%,transparent)] bg-[size:50px_50px]"></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-black"></div>

      <div className="max-w-md w-full bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-sm shadow-[0_0_50px_rgba(234,88,12,0.1)] relative z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600"></div>
        
        <div className="p-8 text-center border-b border-zinc-800">
            <div className="w-16 h-16 bg-black border border-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(234,88,12,0.2)]">
                <Fingerprint className="text-orange-500 animate-pulse" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white font-['Chakra_Petch'] tracking-widest uppercase">Dev<span className="text-orange-500">Flow</span></h1>
            <p className="text-zinc-500 mt-2 font-mono text-xs tracking-widest uppercase">Secure Terminal Access v3.1</p>
        </div>

        <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-orange-500 mb-1 font-mono uppercase tracking-wider">Identity / Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono placeholder-zinc-800"
                            placeholder="OPERATIVE_ID"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-orange-500 mb-1 font-mono uppercase tracking-wider">Passcode</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 text-zinc-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono placeholder-zinc-800"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-500 text-xs justify-center bg-red-950/20 p-2 border border-red-900/50">
                        <ScanLine size={14} /> {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-black font-bold py-3 uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:shadow-[0_0_25px_rgba(234,88,12,0.5)] font-['Chakra_Petch'] flex items-center justify-center group"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>
                            Authenticate <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">Bypass Protocols</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                    <button 
                        onClick={() => handleQuickLogin('admin@devflow.com')}
                        className="flex flex-col items-center justify-center p-3 border border-zinc-800 bg-black/50 hover:bg-zinc-800 hover:border-orange-500/50 transition-all group"
                    >
                        <ShieldCheck size={20} className="text-zinc-500 group-hover:text-orange-500 mb-2 transition-colors" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-white">Admin</span>
                    </button>
                    <button 
                        onClick={() => handleQuickLogin('manager@devflow.com')}
                        className="flex flex-col items-center justify-center p-3 border border-zinc-800 bg-black/50 hover:bg-zinc-800 hover:border-orange-500/50 transition-all group"
                    >
                        <UserCog size={20} className="text-zinc-500 group-hover:text-orange-500 mb-2 transition-colors" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-white">Manager</span>
                    </button>
                    <button 
                        onClick={() => handleQuickLogin('employee@devflow.com')}
                        className="flex flex-col items-center justify-center p-3 border border-zinc-800 bg-black/50 hover:bg-zinc-800 hover:border-orange-500/50 transition-all group"
                    >
                        <User size={20} className="text-zinc-500 group-hover:text-orange-500 mb-2 transition-colors" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-white">Unit</span>
                    </button>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/50">
                 <button 
                    onClick={openNewSession}
                    className="w-full flex items-center justify-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors text-xs font-mono uppercase tracking-wide group"
                >
                    <ExternalLink size={14} /> Initialize New Terminal Node (Split View)
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;