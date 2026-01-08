# Local Development Guide

## 🚀 Running the Application Locally

### Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open in your browser:**
   ```
   http://localhost:5000
   ```

That's it! The app should be running and accessible in your browser.

## 🔧 Configuration

### Default Port

The application runs on **port 5000** by default.

### Change Port

To use a different port, set the `PORT` environment variable:

```bash
PORT=3000 npm run dev
```

Then access at: `http://localhost:3000`

### Environment Variables

Make sure you have the required environment variables set:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `SESSION_SECRET` - Secret for session cookies
- `REDIS_URL` - Redis connection (optional, for queue system)
- `SENTRY_DSN` - Sentry error tracking (optional)
- `VITE_SENTRY_DSN` - Frontend Sentry (optional)

See `.env.example` or check your environment setup.

## 📱 What You'll See

When you open `http://localhost:5000`:

1. **If not logged in:** Login page
2. **If logged in:** Main dashboard (Opportunities page)

## 🎯 Common Pages

- `/login` - Login page
- `/signup` - Sign up page
- `/` or `/opportunities` - Main opportunities page
- `/following` - Followed stocks
- `/portfolio` - Portfolio management
- `/settings` - User settings
- `/admin` - Admin panel (admin users only)

## 🔍 Troubleshooting

### Port already in use?

```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process or use a different port
PORT=3000 npm run dev
```

### Database connection error?

Make sure:
- `DATABASE_URL` is set correctly
- Database is accessible
- Connection string is valid

### Page not loading?

1. Check that `npm run dev` is running
2. Check the terminal for errors
3. Make sure port 5000 is accessible
4. Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Hot reload not working?

The dev server uses Vite for hot module replacement. If changes aren't reflecting:
- Check browser console for errors
- Restart the dev server
- Clear browser cache

## 🛠️ Development Tips

1. **Check terminal output** - Errors and logs appear in the terminal
2. **Browser DevTools** - Use F12 to inspect and debug
3. **Network tab** - See API requests and responses
4. **Console** - Check for JavaScript errors

## 📝 Next Steps

Once the app is running:
- Create an account or log in
- Explore the features
- Test functionality
- Make changes and see them hot-reload

