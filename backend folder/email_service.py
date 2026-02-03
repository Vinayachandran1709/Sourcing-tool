import resend
from typing import List, Dict
import os
from datetime import datetime

resend.api_key = os.getenv("RESEND_API_KEY")

class EmailService:
    """Email service using Resend for bulk outreach"""
    
    @staticmethod
    def replace_variables(template: str, profile: Dict) -> str:
        """Replace {{name}} variable in template"""
        # Get first name only
        full_name = profile.get('name', '') or profile.get('github_username', 'there')
        first_name = full_name.split()[0] if full_name else 'there'
        
        return template.replace('{{name}}', first_name)
    
    @staticmethod
    def generate_reply_button(reply_method: str, reply_link: str, sender_email: str) -> str:
        """Generate HTML reply button based on method"""
        if reply_method == 'email':
            # Mailto link button
            return f'''
            <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:{sender_email}" style="display: inline-block; padding: 12px 30px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-family: Arial, sans-serif;">
                    Reply to this Email
                </a>
            </div>
            '''
        elif reply_method == 'form' and reply_link:
            # Add UTM parameters
            separator = '&' if '?' in reply_link else '?'
            tracked_link = f"{reply_link}{separator}source=talentbox&utm_source=talentbox&utm_medium=email&utm_campaign=outreach"
            
            return f'''
            <div style="text-align: center; margin: 30px 0;">
                <a href="{tracked_link}" style="display: inline-block; padding: 12px 30px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-family: Arial, sans-serif;">
                    Apply Now
                </a>
            </div>
            '''
        else:
            # Default to email if misconfigured
            return f'''
            <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:{sender_email}" style="display: inline-block; padding: 12px 30px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-family: Arial, sans-serif;">
                    Reply to this Email
                </a>
            </div>
            '''
    
    @staticmethod
    def send_single_email(
        to_email: str,
        subject: str,
        body_html: str,
        sender_email: str = "noreply@talentbox.co",
        sender_name: str = "TalentBox",
        reply_to: str = None
    ) -> Dict:
        """Send a single email via Resend"""
        try:
            params = {
                "from": f"{sender_name} <{sender_email}>",
                "to": [to_email],
                "subject": subject,
                "html": body_html,
            }
            
            if reply_to:
                params["reply_to"] = [reply_to]
            
            response = resend.Emails.send(params)
            
            return {
                'success': True,
                'message_id': response.get('id'),
                'status': 'sent'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status': 'failed'
            }
    
    @staticmethod
    def send_bulk_emails(
        profiles: List[Dict],
        user_settings: Dict
    ) -> Dict:
        """Send bulk emails to multiple profiles"""
        
        results = {
            'sent': 0,
            'failed': 0,
            'details': []
        }
        
        sender_email = user_settings.get('sender_email', 'noreply@talentbox.co')
        sender_name = user_settings.get('sender_name', 'TalentBox')
        subject = user_settings.get('email_subject', 'Exciting Opportunity')
        template = user_settings.get('email_template', 'Hi {{name}},\n\nWe found your profile interesting!')
        reply_method = user_settings.get('reply_method', 'email')
        reply_link = user_settings.get('reply_link', '')
        
        # Generate reply button once
        reply_button = EmailService.generate_reply_button(reply_method, reply_link, sender_email)
        
        # Footer
        footer = '''
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center; font-family: Arial, sans-serif;">
            <p>Sourced via <a href="https://talentbox.co" style="color: #FF6B35; text-decoration: none;">TalentBox</a></p>
        </div>
        '''
        
        for profile in profiles:
            try:
                # Replace variables
                personalized_body = EmailService.replace_variables(template, profile)
                
                # Convert to HTML (simple newline to <br>)
                body_html = personalized_body.replace('\n', '<br>')
                
                # Wrap in basic HTML structure
                full_html = f'''
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="white-space: pre-wrap;">{body_html}</div>
                    {reply_button}
                    {footer}
                </body>
                </html>
                '''
                
                # Get recipient email
                to_email = profile.get('email')
                if not to_email:
                    results['failed'] += 1
                    results['details'].append({
                        'profile_id': profile.get('id'),
                        'status': 'failed',
                        'error': 'No email address'
                    })
                    continue
                
                # Send email
                result = EmailService.send_single_email(
                    to_email=to_email,
                    subject=subject,
                    body_html=full_html,
                    sender_email=sender_email,
                    sender_name=sender_name,
                    reply_to=sender_email
                )
                
                if result['success']:
                    results['sent'] += 1
                    results['details'].append({
                        'profile_id': profile.get('id'),
                        'status': 'sent',
                        'message_id': result.get('message_id')
                    })
                else:
                    results['failed'] += 1
                    results['details'].append({
                        'profile_id': profile.get('id'),
                        'status': 'failed',
                        'error': result.get('error')
                    })
                    
            except Exception as e:
                results['failed'] += 1
                results['details'].append({
                    'profile_id': profile.get('id'),
                    'status': 'failed',
                    'error': str(e)
                })
        
        return results