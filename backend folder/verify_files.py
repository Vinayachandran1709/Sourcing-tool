"""
Verify Files Script - Checks if new code was properly installed
Run this from backend folder: python verify_files.py
"""

import os

# Check for fix markers in files
files_to_check = {
    "main.py": "FIX #3",
    "filter_service.py": "FIX #7",
    "github_integration_service.py": "FIX #4"
}

print("🔍 Verifying files have been updated...\n")

all_good = True

for filename, fix_marker in files_to_check.items():
    if not os.path.exists(filename):
        print(f"❌ {filename} - FILE NOT FOUND")
        all_good = False
        continue
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if fix_marker in content:
        print(f"✅ {filename} - Updated (contains {fix_marker})")
    else:
        print(f"❌ {filename} - NOT UPDATED (missing {fix_marker})")
        all_good = False

print()

if all_good:
    print("🎉 All files have been updated successfully!")
    print("👉 You can now restart the backend with: python main.py")
else:
    print("⚠️ Some files are NOT updated!")
    print("👉 Please replace the files and run this script again.")

# Check for __pycache__
if os.path.exists("__pycache__"):
    print("\n⚠️ WARNING: __pycache__ folder still exists")
    print("👉 Delete it with: rmdir /S /Q __pycache__")
else:
    print("\n✅ No __pycache__ folder found (good)")