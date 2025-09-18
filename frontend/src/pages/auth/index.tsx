import { useState } from 'react';
import { useLogin, useRegister, useCurrentUser } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Eye, EyeOff } from 'lucide-react';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const { data: user } = useCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (isRegistering) {
      if (password !== confirmPassword) {
        return; // Password mismatch will be shown in UI
      }

      try {
        await registerMutation.mutateAsync({
          email,
          password,
        });
        // After successful registration, automatically log in
        await loginMutation.mutateAsync({
          username: email,
          password,
        });
      } catch (error) {
        // Error is handled by React Query and displayed below
      }
    } else {
      try {
        await loginMutation.mutateAsync({
          username: email,
          password,
        });
      } catch (error) {
        // Error is handled by React Query and displayed below
      }
    }
  };

  // This component is only for login/register, user dashboard is handled in App.tsx
  if (user) {
    return null; // Let App.tsx handle authenticated state
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <DarkModeToggle fixed />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center">
            <span className="mr-2">🇸🇬</span>
            {isRegistering ? 'Join ComplainSG' : 'Welcome to ComplainSG'}
          </CardTitle>
          <CardDescription>
            {isRegistering
              ? 'Register to start complaining better and make your voice heard in Singapore'
              : 'Sign in to continue improving how Singapore handles feedback'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-600">Passwords don't match</p>
                )}
              </div>
            )}

            {(loginMutation.error || registerMutation.error) && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                {loginMutation.error?.message || registerMutation.error?.message}
              </div>
            )}

            {registerMutation.isSuccess && (
              <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                Account created successfully! Logging you in...
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                (isRegistering ? registerMutation.isPending : loginMutation.isPending) ||
                !email ||
                !password ||
                (isRegistering && (!confirmPassword || password !== confirmPassword))
              }
            >
              {isRegistering
                ? (registerMutation.isPending ? 'Creating Account...' : 'Create Account')
                : (loginMutation.isPending ? 'Signing in...' : 'Sign In')
              }
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  // Clear form when switching
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                {isRegistering ? 'Sign In' : 'Create Account'}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}