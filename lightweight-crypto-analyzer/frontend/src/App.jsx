import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LoadingIndicator from './components/ui/LoadingIndicator';
import AlgorithmsProvider from './context/AlgorithmsProvider';
import BenchmarkHistoryProvider from './context/BenchmarkHistoryProvider';
import ThemeProvider from './context/ThemeProvider';
import ToastProvider from './context/ToastProvider';
import AppLayout from './layouts/AppLayout';

// Pages are loaded on demand so the charting library is only downloaded where it is used.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EncryptDecrypt = lazy(() => import('./pages/EncryptDecrypt'));
const Benchmark = lazy(() => import('./pages/Benchmark'));
const Comparison = lazy(() => import('./pages/Comparison'));
const IoTSimulation = lazy(() => import('./pages/IoTSimulation'));
const AlgorithmInfo = lazy(() => import('./pages/AlgorithmInfo'));
const AlgorithmDetail = lazy(() => import('./pages/AlgorithmDetail'));
const About = lazy(() => import('./pages/About'));
const NotFound = lazy(() => import('./pages/NotFound'));

function page(Component) {
  return (
    <Suspense fallback={<LoadingIndicator label="Loading page…" />}>
      <Component />
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AlgorithmsProvider>
          <BenchmarkHistoryProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route index element={page(Dashboard)} />
                  <Route path="encrypt" element={page(EncryptDecrypt)} />
                  <Route path="benchmark" element={page(Benchmark)} />
                  <Route path="comparison" element={page(Comparison)} />
                  <Route path="iot" element={page(IoTSimulation)} />
                  <Route path="algorithms" element={page(AlgorithmInfo)} />
                  <Route path="algorithms/:id" element={page(AlgorithmDetail)} />
                  <Route path="about" element={page(About)} />
                  <Route path="*" element={page(NotFound)} />
                </Route>
              </Routes>
            </BrowserRouter>
          </BenchmarkHistoryProvider>
        </AlgorithmsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
