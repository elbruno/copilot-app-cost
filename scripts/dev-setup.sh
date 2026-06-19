#!/bin/bash

set -e

echo "🚀 Setting up copilot-app-cost development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Node.js $NODE_VERSION"
echo "✓ Git $(git --version | cut -d' ' -f3)"

# Navigate to repo root
cd "$(git rev-parse --show-toplevel)"
echo ""
echo "📁 Working directory: $(pwd)"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test
echo ""

# Success message
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start a Copilot session: copilot"
echo "  2. Canvas will open automatically"
echo ""
echo "Documentation:"
echo "  docs/INSTALL.md       - Installation and setup"
echo "  docs/USER_GUIDE.md    - How to use the dashboard"
