#!/bin/bash
# Test script for the complete ML recommendation system

set -e

echo "🧪 Testing ML Recommendation System..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test service
test_service() {
    local service_name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $service_name... "
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        if [ "$response" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ PASS${NC}"
            return 0
        else
            echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ SKIP (curl not available)${NC}"
        return 0
    fi
}

# Test results
tests_passed=0
tests_failed=0

echo "1. Testing ML Service..."
if test_service "ML Service Health" "http://localhost:5000/health" 200; then
    ((tests_passed++))
else
    ((tests_failed++))
fi

if test_service "ML Service Stats" "http://localhost:5000/stats" 200; then
    ((tests_passed++))
else
    ((tests_failed++))
fi

echo ""
echo "2. Testing NestJS Backend..."
if test_service "NestJS Health" "http://localhost:5001" 200; then
    ((tests_passed++))
else
    ((tests_failed++))
fi

echo ""
echo "3. Testing Database Connection..."
if test_service "Database via ML Service" "http://localhost:5000/recommendations/1" 200; then
    ((tests_passed++))
    echo -e "${GREEN}✅ Database connection working${NC}"
else
    ((tests_failed++))
    echo -e "${RED}❌ Database connection failed${NC}"
fi

echo ""
echo "4. Testing Redis Cache..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis connection working${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}❌ Redis connection failed${NC}"
        ((tests_failed++))
    fi
else
    echo -e "${YELLOW}⚠️ Redis test skipped (redis-cli not available)${NC}"
fi

echo ""
echo "5. Testing Service Integration..."
if test_service "NestJS → ML Service" "http://localhost:5001/recommendations/1" 200; then
    ((tests_passed++))
    echo -e "${GREEN}✅ Service integration working${NC}"
else
    ((tests_failed++))
    echo -e "${RED}❌ Service integration failed${NC}"
fi

echo ""
echo "📊 Test Results:"
echo -e "Passed: ${GREEN}$tests_passed${NC}"
echo -e "Failed: ${RED}$tests_failed${NC}"
echo ""

if [ $tests_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your ML recommendation system is working properly.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test with real student data: curl http://localhost:5000/recommendations/1?limit=5"
    echo "2. Check the frontend integration"
    echo "3. Monitor performance with: curl http://localhost:5000/stats"
    exit 0
else
    echo -e "${RED}⚠️ Some tests failed. Please check the following:${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure all services are running:"
    echo "   - ML Service: cd ml-service && python app.py"
    echo "   - NestJS: cd nestjs-backend && npm run start:dev"
    echo "   - Database: docker-compose up mysql-db redis-cache"
    echo ""
    echo "2. Check environment variables in .env files"
    echo "3. Verify database has data: SELECT COUNT(*) FROM enrollments;"
    echo "4. Check service logs for detailed error messages"
    exit 1
fi
