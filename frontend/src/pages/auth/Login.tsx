import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GapLensLogo } from '@/components/logo/GapLensLogo';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const prefilledEmail = (location.state as any)?.email || '';
  const fromPath = (location.state as any)?.from || '/dashboard';

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email)    errs.email    = 'Email is required';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email, password });
      toast({
        type: 'success',
        title: 'Logged in successfully',
        message: 'Welcome to your personal research workspace.',
      });
      navigate(fromPath, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.message ?? 'Invalid credentials. Please try again.';
      toast({ type: 'error', title: 'Login failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-landing-gradient flex">
      {/* ── Left panel: Brand ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-start justify-between p-12">
        <Link to="/" title="Return to GapLens AI Home">
          <GapLensLogo size="lg" theme="dark" />
        </Link>
        <div className="max-w-sm">
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Reveal what your research is missing.
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            GapLens AI analyzes multiple sources and surfaces information gaps,
            contradictions, and stale data — with transparent evidence trails.
          </p>
        </div>
        <p className="text-xs text-white/20">
          "Intelligence begins where information ends."
        </p>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:bg-ivory lg:rounded-l-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Link to="/" title="Return to GapLens AI Home">
              <GapLensLogo size="md" theme="dark" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-modal p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-ink">Welcome back</h2>
              <p className="text-sm text-ink-secondary mt-1">
                Sign in to continue your investigation
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Input
                type="email"
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                required
              />
              <Input
                type={showPwd ? 'text' : 'password'}
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
                iconRight={
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="text-ink-muted hover:text-ink transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="current-password"
                required
              />

              <Button type="submit" variant="primary" className="w-full" loading={loading}
                iconRight={!loading && <ArrowRight className="w-4 h-4" />}>
                Sign in
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-ink/6 text-center">
              <p className="text-sm text-ink-secondary">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-teal hover:underline">
                  Create one free
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
