#!/bin/bash

echo "🚀 Setting up Google OAuth Backend for CreatorCircle"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install express axios cors dotenv

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔐 Creating .env file..."
    echo "GOOGLE_CLIENT_SECRET=your_google_client_secret_here" > .env
    echo "PORT=3000" >> .env
    echo "⚠️  Please update .env with your actual Google Client Secret"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Update .env with your Google Client Secret"
echo "2. Configure Google Cloud Console OAuth settings"
echo "3. Run: node google-oauth-backend.js"
echo "4. Start your React Native app: npm start"
echo ""
echo "📚 See GOOGLE_OAUTH_SETUP.md for detailed instructions"
echo ""
echo "🚀 Ready to start the backend server!" 