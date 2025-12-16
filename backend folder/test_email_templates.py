from database import SessionLocal
from email_templates_service import EmailTemplatesService
from campaign_service import CampaignService

def test_email_templates():
    """Test email templates and campaigns"""
    db = SessionLocal()
    user_id = 1
    
    print("\n" + "="*60)
    print("Testing Email Templates & Campaigns")
    print("="*60 + "\n")
    
    # Test 1: Create default templates
    print("1️⃣ Creating default templates...")
    EmailTemplatesService.create_default_templates(db, user_id)
    print("   ✅ Default templates created\n")
    
    # Test 2: Get all templates
    print("2️⃣ Fetching templates...")
    templates = EmailTemplatesService.get_user_templates(db, user_id)
    for template in templates:
        print(f"   📧 {template.name} ({template.template_type})")
        print(f"      Subject: {template.subject}")
        print(f"      Default: {template.is_default}")
    print()
    
    # Test 3: Personalize a template
    print("3️⃣ Testing template personalization...")
    initial_template = EmailTemplatesService.get_template_by_type(db, user_id, "initial")
    
    if initial_template:
        variables = {
            "name": "John Doe",
            "company": "TechCorp",
            "role": "Senior Backend Developer",
            "primary_language": "Python",
            "top_repo": "awesome-api",
            "sender_name": "Jane Smith",
            "sender_company": "TechCorp"
        }
        
        personalized = EmailTemplatesService.personalize_template(initial_template, variables)
        print("   Subject:", personalized["subject"])
        print("   Body preview:", personalized["body"][:200] + "...")
    print()
    
    # Test 4: Get pending follow-ups
    print("4️⃣ Checking for pending follow-ups...")
    pending = CampaignService.get_pending_followups(db)
    print(f"   Found {len(pending)} campaigns needing follow-ups\n")
    
    print("="*60)
    print("✅ All tests completed!")
    print("="*60 + "\n")
    
    db.close()

if __name__ == "__main__":
    test_email_templates()