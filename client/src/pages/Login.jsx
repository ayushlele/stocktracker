import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(name, pin);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Fabric Tracker</h1>
        <p className="login-subtitle">Sign in to manage leftover stock</p>

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="form-group">
            <label htmlFor="name">Username</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Admin"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="pin">4-Digit PIN</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary btn-full mt-4"
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
