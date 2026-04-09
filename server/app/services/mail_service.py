import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)

class MailService:
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.from_email = settings.mail_from_email
        self.from_name = settings.mail_from_name

    async def send_email(self, to_email: str, subject: str, html_content: str):
        """Sends an email asynchronously."""
        if not all([self.smtp_host, self.smtp_user, self.smtp_password]):
            logger.warning("SMTP settings not fully configured, skipping email send", 
                           to_email=to_email, subject=subject)
            logger.info(
                "Email body suppressed",
                to_email=to_email,
                subject=subject,
                body_length=len(html_content),
            )
            return

        await asyncio.to_thread(self._send_sync, to_email, subject, html_content)

    def _send_sync(self, to_email: str, subject: str, html_content: str):
        """Synchronous SMTP send."""
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info("Email sent successfully", to_email=to_email, subject=subject)
        except Exception as e:
            logger.error("Failed to send email", error=str(e), to_email=to_email)
            raise

    async def send_password_reset_email(self, to_email: str, token: str):
        """Sends a password reset email."""
        reset_link = f"{settings.frontend_url}/reset-password?token={token}"
        subject = "Reset your DialBridge password"
        html_content = f"""
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your DialBridge account. Click the button below to set a new password:</p>
            <div style="margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">&copy; 2026 DialBridge AI. All rights reserved.</p>
        </div>
        """
        await self.send_email(to_email, subject, html_content)

mail_service = MailService()
