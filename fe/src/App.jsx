import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

import routes from "./router.jsx";
import { AreaProvider } from "./contexts/AreaContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import "./i18n";

function App() {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    setShowVideo(true);
  }, []);

  return (
    <LanguageProvider>
      <AreaProvider>
          {/* Background video */}
        {/* {showVideo && (
          <video
            id="background-video"
            autoPlay
            muted
            loop
            playsInline
            className="fixed top-0 left-0 w-full h-full object-cover -z-10 opacity-0 transition-opacity duration-700"
            onCanPlay={(e) => (e.target.style.opacity = 1)}
          >
            <source src="/src/assets/vid_bg.mp4" type="video/mp4" />
          </video>
        )} */}
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
