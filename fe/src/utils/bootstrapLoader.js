// Dynamic loader cho Bootstrap CSS chỉ khi cần
let bootstrapLoaded = false;

export const loadBootstrapCSS = async () => {
  if (bootstrapLoaded) return;
  
  try {
    // Import Bootstrap CSS dynamically
    await import('bootstrap/dist/css/bootstrap.min.css');
    bootstrapLoaded = true;
    console.log('Bootstrap CSS loaded dynamically');
  } catch (error) {
    console.error('Failed to load Bootstrap CSS:', error);
  }
};

export const unloadBootstrapCSS = () => {
  if (!bootstrapLoaded) return;
  
  // Remove Bootstrap CSS from document
  const bootstrapLinks = document.querySelectorAll('link[href*="bootstrap"]');
  bootstrapLinks.forEach(link => {
    if (link.href.includes('bootstrap.min.css')) {
      link.remove();
    }
  });
  
  bootstrapLoaded = false;
  console.log('Bootstrap CSS unloaded');
};
