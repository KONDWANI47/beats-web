# Beats Web - Music Production Community

A community website for music producers, featuring DAW software information, VST plugins, and file sharing capabilities.

## Features

- User authentication (login/register)
- Music software showcase
- File upload system
- Search functionality
- Responsive design

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: SQLite
- File Storage: Local with Multer

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node server.js
```

3. Visit http://localhost:3000 in your browser

## Deployment on Render.com

1. Create a Render.com account at https://render.com

2. Install Git and create a repository:
```bash
git init
git add .
git commit -m "Initial commit"
```

3. Create a new Web Service on Render:
   - Connect your repository
   - Set Build Command: `npm install`
   - Set Start Command: `node server.js`

4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`

5. Deploy your application

## Environment Variables

- `NODE_ENV`: Set to 'production' for deployment
- `PORT`: Server port (default: 3000)

## Project Structure

```
beats-web/
├── public/          # Static files
├── uploads/         # Uploaded files
├── index.html       # Main page
├── login.html       # Login page
├── register.html    # Registration page
├── styles.css       # Styles
├── script.js        # Client-side JavaScript
├── auth.js         # Authentication logic
├── config.js       # Configuration
├── server.js       # Express server
└── package.json    # Dependencies
```

## License

MIT License

## Contact

Email: cupicsart@gmail.com
