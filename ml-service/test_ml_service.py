#!/usr/bin/env python3
"""
ML Service Testing Script
Run this to verify that your ML recommendation system is working properly
"""

import requests
import json
import sys
from datetime import datetime

def test_ml_service():
    """Test the ML service running on localhost"""
    
    print("🧪 Testing ML Recommendation Service")
    print("=" * 60)
    print(f"⏰ Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    test_passed = 0
    test_total = 0
    
    # Test 1: Health Check
    print("\n1️⃣ Testing Health Check...")
    test_total += 1
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("   ✅ ML Service is running!")
            health_data = response.json()
            print(f"   📊 Status: {health_data.get('status', 'unknown')}")
            print(f"   🕐 Timestamp: {health_data.get('timestamp', 'N/A')}")
            print(f"   💾 Redis Available: {health_data.get('redis_available', 'N/A')}")
            print(f"   🗄️ Database Available: {health_data.get('database_available', 'N/A')}")
            test_passed += 1
        else:
            print(f"   ❌ Health check failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to ML service!")
        print("   💡 Make sure ML service is running: python app.py")
        return False
    except Exception as e:
        print(f"   ❌ Health check error: {e}")

    # Test 2: Course Recommendations
    print("\n2️⃣ Testing Course Recommendations...")
    test_users = [1, 2, 3]  # Test different user IDs
    
    for user_id in test_users:
        test_total += 1
        print(f"\n   📚 Testing User {user_id} Recommendations:")
        try:
            response = requests.get(f"{base_url}/recommendations/{user_id}?limit=5", timeout=15)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    recommendations = data.get('recommendations', [])
                    
                    if recommendations:
                        print(f"      ✅ Found {len(recommendations)} recommendations:")
                        for i, course in enumerate(recommendations, 1):
                            title = course.get('title', 'Unknown Course')
                            score = course.get('score', 0)
                            category = course.get('category', 'Unknown')
                            print(f"         {i}. {title}")
                            print(f"            Score: {score:.3f} | Category: {category}")
                        test_passed += 1
                    else:
                        print("      ⚠️ No recommendations found for this user")
                else:
                    print(f"      ❌ API returned success=false: {data.get('error', 'Unknown error')}")
            else:
                print(f"      ❌ Request failed: HTTP {response.status_code}")
                if response.text:
                    print(f"      Error details: {response.text}")
        except Exception as e:
            print(f"      ❌ Error: {e}")

    # Test 3: Batch Recommendations
    print("\n3️⃣ Testing Batch Recommendations...")
    test_total += 1
    try:
        batch_data = {
            "student_ids": [1, 2, 3],
            "limit": 3
        }
        response = requests.post(
            f"{base_url}/recommendations/batch", 
            json=batch_data, 
            timeout=20,
            headers={'Content-Type': 'application/json'}
        )
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Batch recommendations working!")
            print(f"   📊 Generated recommendations for {len(data)} users")
            test_passed += 1
        else:
            print(f"   ❌ Batch recommendations failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   ❌ Batch recommendations error: {e}")

    # Test Results Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Tests Passed: {test_passed}/{test_total}")
    print(f"📈 Success Rate: {(test_passed/test_total)*100:.1f}%")
    
    if test_passed == test_total:
        print("🎉 ALL TESTS PASSED! Your ML service is working perfectly!")
    elif test_passed >= test_total * 0.8:
        print("👍 Most tests passed! ML service is mostly functional.")
    else:
        print("⚠️ Some tests failed. Check the errors above.")
    
    print("\n💡 Quick Access URLs:")
    print(f"   Health Check: {base_url}/health")
    print(f"   User 1 Recommendations: {base_url}/recommendations/1")
    
    return test_passed >= test_total * 0.7

if __name__ == "__main__":
    print("🚀 Starting ML Service Test...")
    print("Make sure your ML service is running on port 8000")
    print()
    
    # Install requests if not available
    try:
        import requests
    except ImportError:
        print("📦 Installing requests module...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests
    
    # Run tests
    test_ml_service()
    
    print("\n🏁 Testing Complete!")
    print("\n💻 To start ML service: python app.py")
    print("🌐 To test in browser: http://localhost:8000/health")