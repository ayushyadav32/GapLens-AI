import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GapLensLogo } from '@/components/logo/GapLensLogo';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.first_name) errs.first_name = 'First name is required';
    if (!form.email)      errs.email = 'Email is required';
    if (!form.password)   errs.password = 'Password is required';
    if (form.password && form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form);
      setIsSuccess(true);
      toast({
        type: 'success',
        title: 'Account created',
        message: 'Your account is ready. Please log in.',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.email?.[0] ?? 'Registration failed. Please try again.';
      toast({ type: 'error', title: 'Registration failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-landing-gradient flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="flex justify-center mb-8">
            <Link to="/" title="Return to GapLens AI Home">
              <GapLensLogo size="md" theme="dark" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-modal p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-teal/10 text-teal flex items-center justify-center mx-auto shadow-teal-sm">
              <CheckCircle2 className="w-9 h-9 text-teal" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-ink">Account Created Successfully!</h2>
              <p className="text-sm text-ink-secondary max-w-sm mx-auto leading-relaxed">
                Your account is ready. Please log in to access your personal research workspace.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-ivory-50 border border-ink/8 text-xs text-ink-secondary text-left space-y-1">
              <p className="font-semibold text-ink">Registered Email:</p>
              <p className="font-mono text-teal font-medium">{form.email}</p>
            </div>

            <Button
              variant="primary"
              className="w-full text-sm font-bold shadow-teal"
              size="lg"
              onClick={() => navigate('/login', { state: { email: form.email } })}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Go to Login
            </Button>

            <div className="pt-2 text-center">
              <Link to="/" className="text-xs text-ink-muted hover:text-teal font-semibold transition-colors">
                ← Return to Home Page
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-landing-gradient flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <Link to="/" title="Return to GapLens AI Home">
            <GapLensLogo size="md" theme="dark" />
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-modal p-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-ink">Create your account</h2>
            <p className="text-sm text-ink-secondary mt-1">
              Start investigating information gaps today
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First name"
                placeholder="Jane"
                value={form.first_name}
                onChange={set('first_name')}
                error={errors.first_name}
                icon={<User className="w-4 h-4" />}
                autoComplete="given-name"
                required
              />
              <Input
                label="Last name"
                placeholder="Smith"
                value={form.last_name}
                onChange={set('last_name')}
                autoComplete="family-name"
              />
            </div>
            <Input
              type="email"
              label="Email address"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />
            <Input
              type={showPwd ? 'text' : 'password'}
              label="Password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              icon={<Lock className="w-4 h-4" />}
              iconRight={
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="text-ink-muted hover:text-ink transition-colors"
                  aria-label={showPwd ? 'Hide' : 'Show'}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="new-password"
              required
            />

            <Button type="submit" variant="primary" className="w-full mt-2" loading={loading}
              iconRight={!loading && <ArrowRight className="w-4 h-4" />}>
              Create account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink/6 text-center">
            <p className="text-sm text-ink-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-teal hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
