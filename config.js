const config = {
    // Replace this URL with your actual Render.com domain once deployed
    apiUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000'
        : 'https://beats-web.onrender.com'  // Replace with your actual Render.com URL
};

export default config;
