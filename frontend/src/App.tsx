import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* TODO: Add routes for Dashboard, Insights, Library, Settings, Operator */}
          <Route path="/" element={<div>SpendSense Frontend</div>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

