import { Routes, Route } from "react-router-dom";

import routes from "./Router";
import { AreaProvider } from "./contexts/AreaContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import "./i18n";
import "@/styles/dashboard-bg.css";

function App() {
  return (
    <LanguageProvider>
      <AreaProvider>
        <NotificationProvider>
          <div className="app-bg">
            <div className="app-bg__base" />
            <div className="app-bg__nebula" />
            <div className="app-bg__moon" />
            <div className="app-bg__stars" />
            <div className="app-bg__stars-layer2" />
            <div className="app-bg__stars-twinkle" />
            <div className="app-bg__stars-twinkle-2" />
          </div>
          <Routes>
            {routes.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
          </Routes>
        </NotificationProvider>
      </AreaProvider>
    </LanguageProvider>
  );
}

export default App;