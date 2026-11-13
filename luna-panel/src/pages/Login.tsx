import { useQueryClient } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Field, Input, Spinner } from '../components/ui';
import { api, ApiError } from '../lib/api';

export function Login() {
  const [params] = useSearchParams();
  const token = params.get('token');
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[20px] border border-line bg-surface p-7 md:p-9">
        <p className="mb-6 font-display text-[26px] font-bold">
          Luna <span className="text-brand">Kuyen</span>
        </p>
        {token ? <VerifyToken token={token} /> : <RequestLink />}
      </div>
    </div>
  );
}

function RequestLink() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.requestLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? 'Pediste muchos links seguidos. Esperá unos minutos.' : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <MailCheck className="size-9 text-brand" aria-hidden />
        <h1 className="text-xl font-semibold">Revisá tu mail</h1>
        <p className="text-ink-3">
          Si <strong className="text-ink">{email}</strong> tiene acceso, te llegó un link para entrar. Vence en 15 minutos.
        </p>
        <Button variant="ghost" className="self-start px-0" onClick={() => setSent(false)}>
          Usar otro mail
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold">Entrá al panel de tu sitio</h1>
        <p className="text-ink-3">Te mandamos un link a tu mail. Sin contraseñas.</p>
      </div>
      <Field label="Tu mail" error={error}>
        {(p) => (
          <Input {...p} type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@mail.com" />
        )}
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        Mandame el link
      </Button>
    </form>
  );
}

function VerifyToken({ token }: { token: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const started = useRef(false); // el link sirve una sola vez: que StrictMode no lo use dos veces

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api
      .verify(token)
      .then(({ user }) => {
        qc.setQueryData(['me'], user);
        navigate('/', { replace: true });
      })
      .catch((err: Error) => setError(err.message));
  }, [token, navigate, qc]);

  if (!error) return <Spinner label="Entrando…" />;
  return (
    <div className="flex flex-col gap-4" role="alert">
      <h1 className="text-xl font-semibold">Ese link ya no sirve</h1>
      <p className="text-ink-3">{error}</p>
      <Button variant="primary" onClick={() => navigate('/entrar', { replace: true })}>
        Pedir un link nuevo
      </Button>
    </div>
  );
}
