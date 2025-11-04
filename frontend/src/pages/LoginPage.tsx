import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import api from '../lib/apiClient';

interface ExampleUsers {
  exampleEmails: string[];
  password: string;
  operatorEmail: string;
  operatorPassword: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [exampleUsers, setExampleUsers] = useState<ExampleUsers | null>(null);
  const [loadingExamples, setLoadingExamples] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Fetch example users on mount
  useEffect(() => {
    const fetchExampleUsers = async () => {
      try {
        const response = await api.get('/auth/example-users');
        setExampleUsers(response.data);
      } catch (err) {
        console.error('Failed to fetch example users:', err);
        // Fallback if API call fails
        setExampleUsers({
          exampleEmails: [],
          password: 'password123',
          operatorEmail: 'operator@spendsense.com',
          operatorPassword: 'operator123',
        });
      } finally {
        setLoadingExamples(false);
      }
    };

    if (isLogin) {
      fetchExampleUsers();
    }
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to SpendSense' : 'Create your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLogin ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {isLogin && (
            <div className="text-center text-sm text-gray-600 space-y-1">
              <p className="font-semibold">Demo credentials:</p>
              <div className="mt-2 space-y-1">
                {exampleUsers && (
                  <>
                    <p>
                      <span className="font-medium">Operator:</span>{' '}
                      {exampleUsers.operatorEmail} / {exampleUsers.operatorPassword}
                    </p>
                    <p>
                      <span className="font-medium">Regular users:</span> Use any seeded email (case-insensitive) +{' '}
                      <span className="font-mono">{exampleUsers.password}</span>
                    </p>
                    {exampleUsers.exampleEmails.length > 0 && (
                      <div className="text-xs text-gray-400 mt-1">
                        <p className="font-medium mb-1">Example emails:</p>
                        <div className="space-y-0.5">
                          {exampleUsers.exampleEmails.map((exampleEmail, idx) => (
                            <p key={idx} className="font-mono">
                              {exampleEmail}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                <p className="text-xs text-gray-500 mt-2">Or register a new account below</p>
                  </>
                )}
                {loadingExamples && (
                  <p className="text-xs text-gray-400">Loading example users...</p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

