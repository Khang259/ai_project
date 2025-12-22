import { Routes, Route } from "react-router-dom";

import routes from "./Router";
import { AreaProvider } from "./contexts/AreaContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import "./i18n";

function App() {
  return (
    <LanguageProvider>
      <AreaProvider>
        <div className="fixed top-0 left-0 w-full h-full bg-black -z-10"></div>
        <Routes>
          {routes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
      </AreaProvider>
    </LanguageProvider>
  );
}

export default App;