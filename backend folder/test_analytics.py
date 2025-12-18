from database import SessionLocal
from analytics_service import AnalyticsService

def test_analytics():
    """Test analytics service"""
    db = SessionLocal()
    
    print("\n" + "="*70)
    print("📊 TESTING ANALYTICS")
    print("="*70 + "\n")
    
    # Test 1: Dashboard Metrics
    print("1️⃣ Dashboard Metrics")
    print("-" * 70)
    metrics = AnalyticsService.get_dashboard_metrics(db)
    
    print(f"\n👥 USERS:")
    print(f"   Total: {metrics['users']['total']}")
    print(f"   Free: {metrics['users']['free']}")
    print(f"   Paid: {metrics['users']['paid']}")
    print(f"   Trial: {metrics['users']['trial']}")
    print(f"   Active Subscribers: {metrics['users']['active_subscribers']}")
    
    print(f"\n📈 SIGNUPS:")
    print(f"   Today: {metrics['signups']['today']}")
    print(f"   This Week: {metrics['signups']['week']}")
    print(f"   This Month: {metrics['signups']['month']}")
    
    print(f"\n💰 REVENUE:")
    print(f"   MRR: ₹{metrics['revenue']['mrr']:,}")
    print(f"   ARR: ₹{metrics['revenue']['arr']:,}")
    print(f"   ARPU: ₹{metrics['revenue']['arpu']:,.2f}")
    
    print(f"\n🎯 CONVERSIONS:")
    print(f"   Total: {metrics['conversions']['total']}")
    print(f"   This Month: {metrics['conversions']['month']}")
    print(f"   Rate: {metrics['conversions']['rate']}%")
    
    print(f"\n📊 USAGE:")
    print(f"   Total Searches: {metrics['usage']['total_searches']}")
    print(f"   Total Emails: {metrics['usage']['total_emails']}")
    print(f"   Total Campaigns: {metrics['usage']['total_campaigns']}")
    print(f"   Total Lists: {metrics['usage']['total_lists']}")
    
    # Test 2: Conversion Funnel
    print("\n2️⃣ Conversion Funnel (Last 30 Days)")
    print("-" * 70)
    funnel = AnalyticsService.get_conversion_funnel(db, days=30)
    
    print(f"\n🔄 FUNNEL STAGES:")
    for stage_name, stage_data in funnel['funnel'].items():
        print(f"\n   {stage_name.upper()}:")
        print(f"      Count: {stage_data['count']}")
        print(f"      Overall %: {stage_data['percentage']}%")
        if 'conversion_from_previous' in stage_data:
            print(f"      Conversion from previous: {stage_data['conversion_from_previous']}%")
    
    print(f"\n   📊 Overall Conversion Rate: {funnel['overall_conversion_rate']}%")
    
    # Test 3: Engagement
    print("\n3️⃣ Engagement Metrics")
    print("-" * 70)
    engagement = AnalyticsService.get_engagement_metrics(db, days=30)
    
    print(f"\n👤 ACTIVE USERS:")
    print(f"   Daily (DAU): {engagement['active_users']['daily']}")
    print(f"   Weekly (WAU): {engagement['active_users']['weekly']}")
    print(f"   Monthly (MAU): {engagement['active_users']['monthly']}")
    
    print(f"\n📊 STICKINESS:")
    print(f"   DAU/MAU Ratio: {engagement['stickiness']['dau_mau_ratio']}%")
    print(f"   WAU/MAU Ratio: {engagement['stickiness']['wau_mau_ratio']}%")
    
    print(f"\n📈 AVERAGES PER USER:")
    print(f"   Searches: {engagement['average_per_user']['searches']}")
    print(f"   Emails: {engagement['average_per_user']['emails']}")
    
    # Test 4: Top Users
    print("\n4️⃣ Top 5 Most Active Users")
    print("-" * 70)
    top_users = AnalyticsService.get_top_users(db, limit=5)
    
    if top_users:
        for i, user in enumerate(top_users, 1):
            print(f"\n   {i}. {user['name']} ({user['email']})")
            print(f"      Company: {user['company']}")
            print(f"      Plan: {user['plan']} ({user['status']})")
            print(f"      Searches: {user['searches']} | Emails: {user['emails_sent']}")
    else:
        print("\n   No active users yet")
    
    print("\n" + "="*70)
    print("✅ Analytics test complete!")
    print("="*70 + "\n")
    
    db.close()

if __name__ == "__main__":
    test_analytics()