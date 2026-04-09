#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone
import uuid

class ImpactoAPITester:
    def __init__(self, base_url="https://task-coordinator-4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_event_id = None
        self.test_template_id = None
        self.test_category_id = None
        self.test_task_id = None
        self.test_member_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "/",
            200
        )
        return success

    def test_seed_template(self):
        """Test seeding the default IMPACTO template"""
        success, response = self.run_test(
            "Seed IMPACTO Template",
            "POST",
            "/seed-impacto-template",
            200
        )
        if success and 'template_id' in response:
            self.test_template_id = response['template_id']
        return success

    def test_get_templates(self):
        """Test getting all templates"""
        success, response = self.run_test(
            "Get Templates",
            "GET",
            "/templates",
            200
        )
        if success and response and len(response) > 0:
            # Use the first template for testing
            self.test_template_id = response[0]['id']
            print(f"   Found {len(response)} template(s)")
        return success

    def test_create_event(self):
        """Test creating a new event"""
        event_data = {
            "name": f"Test Event {datetime.now().strftime('%H%M%S')}",
            "description": "Test event for API testing",
            "location": "Test Location"
        }
        success, response = self.run_test(
            "Create Event",
            "POST",
            "/events",
            200,
            data=event_data
        )
        if success and 'id' in response:
            self.test_event_id = response['id']
            print(f"   Created event with ID: {self.test_event_id}")
        return success

    def test_get_events(self):
        """Test getting all events"""
        success, response = self.run_test(
            "Get Events",
            "GET",
            "/events",
            200
        )
        if success:
            print(f"   Found {len(response)} event(s)")
        return success

    def test_get_event(self):
        """Test getting a specific event"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        success, response = self.run_test(
            "Get Event by ID",
            "GET",
            f"/events/{self.test_event_id}",
            200
        )
        return success

    def test_apply_template(self):
        """Test applying template to event"""
        if not self.test_event_id or not self.test_template_id:
            print("❌ Skipped - Missing event or template ID")
            return False
        
        success, response = self.run_test(
            "Apply Template to Event",
            "POST",
            f"/events/{self.test_event_id}/apply-template/{self.test_template_id}",
            200
        )
        return success

    def test_get_categories(self):
        """Test getting categories for an event"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        success, response = self.run_test(
            "Get Event Categories",
            "GET",
            f"/events/{self.test_event_id}/categories",
            200
        )
        if success and response and len(response) > 0:
            self.test_category_id = response[0]['id']
            print(f"   Found {len(response)} categories")
        return success

    def test_create_category(self):
        """Test creating a new category"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        category_data = {
            "name": "Test Category",
            "phase": "antes",
            "order": 999
        }
        success, response = self.run_test(
            "Create Category",
            "POST",
            f"/events/{self.test_event_id}/categories",
            200,
            data=category_data
        )
        if success and 'id' in response:
            print(f"   Created category with ID: {response['id']}")
        return success

    def test_get_tasks(self):
        """Test getting tasks for an event"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        success, response = self.run_test(
            "Get Event Tasks",
            "GET",
            f"/events/{self.test_event_id}/tasks",
            200
        )
        if success and response and len(response) > 0:
            self.test_task_id = response[0]['id']
            print(f"   Found {len(response)} tasks")
        return success

    def test_create_task(self):
        """Test creating a new task"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        task_data = {
            "title": "Test Task",
            "description": "Test task description",
            "phase": "antes",
            "category": "Test Category",
            "status": "pending"
        }
        success, response = self.run_test(
            "Create Task",
            "POST",
            f"/events/{self.test_event_id}/tasks",
            200,
            data=task_data
        )
        if success and 'id' in response:
            self.test_task_id = response['id']
            print(f"   Created task with ID: {self.test_task_id}")
        return success

    def test_update_task_status(self):
        """Test updating task status"""
        if not self.test_event_id or not self.test_task_id:
            print("❌ Skipped - Missing event or task ID")
            return False
        
        update_data = {"status": "completed"}
        success, response = self.run_test(
            "Update Task Status",
            "PUT",
            f"/events/{self.test_event_id}/tasks/{self.test_task_id}",
            200,
            data=update_data
        )
        return success

    def test_create_member(self):
        """Test creating a new member"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        member_data = {
            "name": "Test Member",
            "role": "Test Role"
        }
        success, response = self.run_test(
            "Create Member",
            "POST",
            f"/events/{self.test_event_id}/members",
            200,
            data=member_data
        )
        if success and 'id' in response:
            self.test_member_id = response['id']
            print(f"   Created member with ID: {self.test_member_id}")
        return success

    def test_get_members(self):
        """Test getting members for an event"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        success, response = self.run_test(
            "Get Event Members",
            "GET",
            f"/events/{self.test_event_id}/members",
            200
        )
        if success:
            print(f"   Found {len(response)} members")
        return success

    def test_assign_member_to_task(self):
        """Test assigning member to task"""
        if not self.test_event_id or not self.test_task_id or not self.test_member_id:
            print("❌ Skipped - Missing event, task, or member ID")
            return False
        
        update_data = {"assigned_to": [self.test_member_id]}
        success, response = self.run_test(
            "Assign Member to Task",
            "PUT",
            f"/events/{self.test_event_id}/tasks/{self.test_task_id}",
            200,
            data=update_data
        )
        return success

    def test_get_event_stats(self):
        """Test getting event statistics"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        success, response = self.run_test(
            "Get Event Statistics",
            "GET",
            f"/events/{self.test_event_id}/stats",
            200
        )
        if success:
            print(f"   Stats: {response.get('completed', 0)}/{response.get('total', 0)} tasks completed ({response.get('percentage', 0)}%)")
        return success

    def test_save_as_template(self):
        """Test saving event as template"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        template_name = f"Test Template {datetime.now().strftime('%H%M%S')}"
        success, response = self.run_test(
            "Save Event as Template",
            "POST",
            f"/events/{self.test_event_id}/save-as-template",
            200,
            params={"name": template_name, "description": "Test template"}
        )
        return success

    def test_delete_task(self):
        """Test deleting a task"""
        if not self.test_event_id or not self.test_task_id:
            print("❌ Skipped - Missing event or task ID")
            return False
        
        success, response = self.run_test(
            "Delete Task",
            "DELETE",
            f"/events/{self.test_event_id}/tasks/{self.test_task_id}",
            200
        )
        return success

    def test_delete_member(self):
        """Test deleting a member"""
        if not self.test_event_id or not self.test_member_id:
            print("❌ Skipped - Missing event or member ID")
            return False
        
        success, response = self.run_test(
            "Delete Member",
            "DELETE",
            f"/events/{self.test_event_id}/members/{self.test_member_id}",
            200
        )
        return success

    def test_delete_event(self):
        """Test deleting an event"""
        if not self.test_event_id:
            print("❌ Skipped - No test event ID available")
            return False
        
        success, response = self.run_test(
            "Delete Event",
            "DELETE",
            f"/events/{self.test_event_id}",
            200
        )
        return success

def main():
    print("🚀 Starting IMPACTO API Testing...")
    print("=" * 50)
    
    tester = ImpactoAPITester()
    
    # Test sequence
    test_results = []
    
    # Basic API tests
    test_results.append(("Health Check", tester.test_health_check()))
    test_results.append(("Seed Template", tester.test_seed_template()))
    test_results.append(("Get Templates", tester.test_get_templates()))
    
    # Event management tests
    test_results.append(("Create Event", tester.test_create_event()))
    test_results.append(("Get Events", tester.test_get_events()))
    test_results.append(("Get Event by ID", tester.test_get_event()))
    test_results.append(("Apply Template", tester.test_apply_template()))
    
    # Category tests
    test_results.append(("Get Categories", tester.test_get_categories()))
    test_results.append(("Create Category", tester.test_create_category()))
    
    # Task management tests
    test_results.append(("Get Tasks", tester.test_get_tasks()))
    test_results.append(("Create Task", tester.test_create_task()))
    test_results.append(("Update Task Status", tester.test_update_task_status()))
    
    # Member management tests
    test_results.append(("Create Member", tester.test_create_member()))
    test_results.append(("Get Members", tester.test_get_members()))
    test_results.append(("Assign Member to Task", tester.test_assign_member_to_task()))
    
    # Statistics and template tests
    test_results.append(("Get Event Stats", tester.test_get_event_stats()))
    test_results.append(("Save as Template", tester.test_save_as_template()))
    
    # Cleanup tests
    test_results.append(("Delete Task", tester.test_delete_task()))
    test_results.append(("Delete Member", tester.test_delete_member()))
    test_results.append(("Delete Event", tester.test_delete_event()))
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    
    failed_tests = []
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if not result:
            failed_tests.append(test_name)
    
    print(f"\n📈 Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
        return 1
    else:
        print("\n🎉 All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())