import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './styles/main.scss';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
// import About from './pages/About';
import TheOffice from './pages/TheOffice';

// Dev-only: `import.meta.env.DEV` is false in a production build, so the import (and the page) is dropped from the bundle
const CharacterViewer = import.meta.env.DEV ? lazy(() => import('./pages/CharacterViewer')) : null;

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Parent route using the layout */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          {/* <Route path="about" element={<About />} /> */}
          <Route path="office" element={<TheOffice />} />
        </Route>
        {CharacterViewer && (
          <Route path="/dev/characters" element={<Suspense fallback={null}><CharacterViewer /></Suspense>} />
        )}
      </Routes>
    </HashRouter>
  );
}