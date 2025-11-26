from database import SessionLocal
from models import Profile
from datetime import datetime, timedelta, timezone

def create_test_profile(username, stars, repos, contributions, days_ago, num_languages):
    """Create a test profile with specific values"""
    
    db = SessionLocal()
    
    try:
        # Create last_active_date
        last_active = datetime.now(timezone.utc) - timedelta(days=days_ago)
        
        # Create languages data
        languages = {}
        if num_languages > 0:
            # Create dummy languages
            lang_names = ["Python", "JavaScript", "Java", "Go", "Rust", 
                         "TypeScript", "C++", "Ruby", "PHP", "Swift"]
            for i in range(min(num_languages, len(lang_names))):
                languages[lang_names[i]] = 100 - (i * 5)  # Decreasing percentages
        
        # Check if profile already exists
        existing = db.query(Profile).filter(
            Profile.github_username == username
        ).first()
        
        if existing:
            # Update existing
            profile = existing
            profile.total_stars = stars
            profile.public_repos = repos
            profile.contributions_last_year = contributions
            profile.last_active_date = last_active
            profile.languages_data = languages
        else:
            # Create new
            profile = Profile(
                github_username=username,
                name=f"Test User {username}",
                email=f"{username}@test.com",
                total_stars=stars,
                public_repos=repos,
                contributions_last_year=contributions,
                last_active_date=last_active,
                languages_data=languages
            )
            db.add(profile)
        
        db.commit()
        db.refresh(profile)
        
        return profile
        
    finally:
        db.close()

def test_scoring_algorithm():
    """Test scoring with various developer profiles"""
    
    print("=" * 80)
    print("TESTING DEVELOPER SCORING ALGORITHM")
    print("=" * 80)
    print()
    
    # Define test cases
    test_cases = [
        {
            "name": "Brand New Developer",
            "username": "newbie_dev",
            "stars": 5,
            "repos": 3,
            "contributions": 20,
            "days_ago": 7,
            "num_languages": 1,
            "expected_range": (15, 35)
        },
        {
            "name": "Junior Developer",
            "username": "junior_dev",
            "stars": 80,
            "repos": 15,
            "contributions": 120,
            "days_ago": 30,
            "num_languages": 3,
            "expected_range": (35, 55)
        },
        {
            "name": "Mid-Level Developer",
            "username": "mid_dev",
            "stars": 350,
            "repos": 35,
            "contributions": 280,
            "days_ago": 5,
            "num_languages": 5,
            "expected_range": (50, 70)
        },
        {
            "name": "Senior Developer",
            "username": "senior_dev",
            "stars": 1200,
            "repos": 65,
            "contributions": 520,
            "days_ago": 2,
            "num_languages": 7,
            "expected_range": (70, 85)
        },
        {
            "name": "Expert Developer",
            "username": "expert_dev",
            "stars": 2500,
            "repos": 95,
            "contributions": 850,
            "days_ago": 1,
            "num_languages": 10,
            "expected_range": (85, 100)
        },
        {
            "name": "Inactive Veteran",
            "username": "inactive_vet",
            "stars": 5000,
            "repos": 120,
            "contributions": 50,  # Low recent contributions
            "days_ago": 800,  # Inactive for 2+ years
            "num_languages": 8,
            "expected_range": (40, 65)  # High stats but penalized for inactivity
        }
    ]
    
    results = []
    
    print("Creating test profiles and calculating scores...\n")
    
    for test in test_cases:
        print(f"Testing: {test['name']}")
        print("-" * 80)
        
        # Create profile
        profile = create_test_profile(
            username=test['username'],
            stars=test['stars'],
            repos=test['repos'],
            contributions=test['contributions'],
            days_ago=test['days_ago'],
            num_languages=test['num_languages']
        )
        
        # Calculate score
        score = profile.calculate_developer_score()
        
        # Display results
        print(f"  Stats:")
        print(f"    ⭐ Stars: {test['stars']}")
        print(f"    📦 Repos: {test['repos']}")
        print(f"    📊 Contributions: {test['contributions']}")
        print(f"    🕐 Last active: {test['days_ago']} days ago")
        print(f"    💻 Languages: {test['num_languages']}")
        print()
        print(f"  Calculated Score: {score}/100")
        print(f"  Expected Range: {test['expected_range'][0]}-{test['expected_range'][1]}")
        
        # Check if in expected range
        in_range = test['expected_range'][0] <= score <= test['expected_range'][1]
        status = "✅ PASS" if in_range else "⚠️  OUT OF RANGE"
        print(f"  Result: {status}")
        print()
        
        results.append({
            "name": test['name'],
            "score": score,
            "expected": test['expected_range'],
            "pass": in_range
        })
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    
    passed = sum(1 for r in results if r['pass'])
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}\n")
    
    for result in results:
        status_icon = "✅" if result['pass'] else "⚠️"
        print(f"{status_icon} {result['name']}: Score {result['score']} "
              f"(expected {result['expected'][0]}-{result['expected'][1]})")
    
    print()
    
    if passed == total:
        print("🎉 All tests passed! Scoring algorithm is working correctly.")
    else:
        print("⚠️  Some tests failed. Consider adjusting thresholds or weights.")
    
    print()

if __name__ == "__main__":
    test_scoring_algorithm()
