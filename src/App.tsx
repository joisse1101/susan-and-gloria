import { HashRouter, Routes, Route } from 'react-router-dom';
import './styles/main.scss';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
// import About from './pages/About';
import TheOffice from './pages/TheOffice';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Parent route using the layout */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          {/* <Route path="about" element={<About />} /> */}
        </Route>
        <Route path="/office" element={<TheOffice />} />
      </Routes>
    </HashRouter>
  );
}