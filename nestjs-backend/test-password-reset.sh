#!/bin/bash

# Test script for password reset endpoints
API_BASE="http://localhost:3001/auth"

echo "Testing Password Reset Implementation"
echo "===================================="

# Test 1: Forgot Password Endpoint
echo "1. Testing forgot-password endpoint..."
curl -X POST "$API_BASE/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""

# Test 2: Verify Reset Token Endpoint (with invalid token)
echo "2. Testing verify-reset-token endpoint with invalid token..."
curl -X GET "$API_BASE/verify-reset-token/invalid-token" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""

# Test 3: Reset Password Endpoint (with invalid token)
echo "3. Testing reset-password endpoint with invalid token..."
curl -X POST "$API_BASE/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token","newPassword":"newPassword123"}' \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "Test completed. If the server is running, you should see API responses above."
