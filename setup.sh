#!/bin/bash

# WageGuard Setup Script
# Automates the setup process for development and production environments

set -e  # Exit on any error

echo "🚀 WageGuard Setup Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("Node.js 18+")
    else
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            missing_deps+=("Node.js 18+ (current: $(node --version))")
        else
            print_status "Node.js $(node --version) ✓"
        fi
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    else
        print_status "npm $(npm --version) ✓"
    fi
    
    if ! command_exists psql && ! command_exists docker; then
        missing_deps+=("PostgreSQL or Docker")
    else
        if command_exists psql; then
            print_status "PostgreSQL ✓"
        fi
        if command_exists docker; then
            print_status "Docker ✓"
        fi
    fi
    
    if ! command_exists git; then
        missing_deps+=("Git")
    else
        print_status "Git $(git --version | cut -d' ' -f3) ✓"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install the missing dependencies and run this script again."
        echo ""
        echo "Installation guides:"
        echo "  - Node.js: https://nodejs.org/"
        echo "  - PostgreSQL: https://postgresql.org/download/"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_section "Installing Dependencies"
    
    print_status "Installing backend dependencies..."
    npm ci
    
    print_status "Installing frontend dependencies..."
    cd frontend && npm ci && cd ..
    
    print_status "Dependencies installed successfully!"
}

# Setup environment
setup_environment() {
    print_section "Setting up Environment"
    
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp env.example .env
        
        # Generate random secrets
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-jwt-secret-in-production-$(date +%s)")
        SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-session-secret-in-production-$(date +%s)")
        
        # Update .env with generated secrets
        if command_exists sed; then
            sed -i.bak "s/your_secure_jwt_secret_change_in_production/$JWT_SECRET/" .env
            sed -i.bak "s/your_session_secret_change_in_production/$SESSION_SECRET/" .env
            rm .env.bak 2>/dev/null || true
        fi
        
        print_warning "Created .env file with generated secrets."
        print_warning "Please update the API keys in .env file before running the application."
    else
        print_status ".env file already exists"
    fi
}

# Setup database
setup_database() {
    print_section "Setting up Database"
    
    read -p "Do you want to set up PostgreSQL database? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command_exists createdb; then
            print_status "Creating database..."
            createdb wageguard 2>/dev/null || print_warning "Database 'wageguard' may already exist"
            
            print_status "Initializing database schema..."
            npm run init-db
            
            print_status "Database setup completed!"
        else
            print_warning "PostgreSQL createdb command not found."
            print_warning "Please create the database manually:"
            echo "  createdb wageguard"
            echo "  npm run init-db"
        fi
    else
        print_status "Skipping database setup"
        print_warning "Remember to create and initialize the database before running the application"
    fi
}

# Setup Docker (optional)
setup_docker() {
    print_section "Docker Setup (Optional)"
    
    if command_exists docker; then
        read -p "Do you want to use Docker for development? (y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [ -f docker-compose.yml ]; then
                print_status "Starting Docker services..."
                docker-compose up -d postgres redis
                
                print_status "Waiting for database to be ready..."
                sleep 5
                
                print_status "Initializing database in Docker..."
                docker-compose exec postgres psql -U wageguard -d wageguard -c "SELECT version();" || {
                    print_warning "Database not ready yet, you may need to run 'npm run init-db' manually"
                }
                
                print_status "Docker services started!"
            else
                print_error "docker-compose.yml not found"
            fi
        fi
    fi
}

# Run tests
run_tests() {
    print_section "Running Tests"
    
    read -p "Do you want to run the test suite? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Running backend tests..."
        if npm test; then
            print_status "All tests passed! ✓"
        else
            print_warning "Some tests failed. This might be due to missing database or API keys."
        fi
    fi
}

# Display final instructions
show_final_instructions() {
    print_section "Setup Complete!"
    
    echo -e "${GREEN}WageGuard is now set up and ready to use!${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Configure your API keys in .env:"
    echo "   - Add at least one AI provider API key (Anthropic, OpenAI, or Google)"
    echo "   - Update database connection if needed"
    echo ""
    echo "2. Start the development servers:"
    echo "   Backend:  npm run dev"
    echo "   Frontend: cd frontend && npm run dev"
    echo ""
    echo "3. Open your browser:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:3001"
    echo ""
    echo "4. Upload sample CSV files from the sample-data/ directory"
    echo ""
    echo "Documentation:"
    echo "   - README.md - Project overview and features"
    echo "   - docs/ - Detailed documentation"
    echo "   - sample-data/ - Test CSV files"
    echo ""
    echo "For deployment guides, see docs/deployment-guide.md"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    check_prerequisites
    install_dependencies
    setup_environment
    setup_database
    setup_docker
    run_tests
    show_final_instructions
}

# Handle script interruption
trap 'echo -e "\n${RED}Setup interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"
