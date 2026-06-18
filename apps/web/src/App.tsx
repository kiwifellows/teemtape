import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { WatchlistPage } from "./pages/WatchlistPage";

function WatchlistRoute() {
  const { token } = useParams<{ token: string }>();
  if (!token) return <Navigate to="/" replace />;
  return <WatchlistPage token={token} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/w/:token" element={<WatchlistRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
