import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { api, ApiError } from './lib/api';
import { SiteProvider } from './lib/site';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Sections } from './pages/Sections';
import { SettingsPage } from './pages/Settings';

// El editor trae Tiptap: se carga recién cuando se abre una sección.
const SectionEditor = lazy(() => import('./pages/SectionEditor').then((m) => ({ default: m.SectionEditor })));

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route path="/*" element={<Authed />} />
    </Routes>
  );
}

/** Todo lo de adentro necesita sesión; sin ella, al login. */
function Authed() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: (n, err) => !(err instanceof ApiError && err.status === 401) && n < 2,
  });
  if (me.isLoading) return <Spinner />;
  if (!me.data) {
    if (me.error instanceof ApiError && me.error.status !== 401) {
      return <p className="p-8 text-center text-ink-3">{me.error.message}</p>;
    }
    return <Navigate to="/entrar" replace />;
  }
  return (
    <SiteProvider>
      <Routes>
        <Route element={<Layout user={me.data} />}>
          <Route index element={<Home />} />
          <Route path="pagina" element={<Sections />} />
          <Route path="pagina/:id" element={<Suspense fallback={<Spinner />}><SectionEditor /></Suspense>} />
          <Route path="ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SiteProvider>
  );
}
