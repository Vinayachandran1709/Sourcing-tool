import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Handles email outreach"""
    
    @staticmethod
    def send_bulk_emails(company_email: str, company_password: str, recipients: list, subject: str, body_template: str):
        """
        Send personalized emails to multiple developers.
        
        Args:
            company_email: Sender's email (must be Gmail)
            company_password: Gmail app password (not regular password)
            recipients: List of dicts [{"email": "dev@example.com", "name": "John"}]
            subject: Email subject
            body_template: Email body (can include {{name}} placeholder)
        
        Returns:
            Dict with results {"sent": 10, "failed": 2, "errors": [...]}
        """
        results = {"sent": 0, "failed": 0, "errors": []}
        
        # Connect to Gmail SMTP
        try:
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(company_email, company_password)
            logger.info(f"Connected to Gmail as {company_email}")
        except Exception as e:
            logger.error(f"SMTP connection failed: {e}")
            results["errors"].append(f"SMTP connection failed: {str(e)}")
            results["failed"] = len(recipients)
            return results
        
        # Send to each recipient
        for recipient in recipients:
            try:
                # Personalize body
                personalized_body = body_template.replace("{{name}}", recipient.get("name", "Developer"))
                
                # Create email
                msg = MIMEMultipart()
                msg["From"] = company_email
                msg["To"] = recipient["email"]
                msg["Subject"] = subject
                msg.attach(MIMEText(personalized_body, "plain"))
                
                # Send
                server.send_message(msg)
                results["sent"] += 1
                logger.info(f"Sent email to {recipient['email']}")
                
            except Exception as e:
                results["failed"] += 1
                error_msg = f"{recipient['email']}: {str(e)}"
                results["errors"].append(error_msg)
                logger.error(f"Failed to send to {recipient['email']}: {e}")
        
        server.quit()
        return results