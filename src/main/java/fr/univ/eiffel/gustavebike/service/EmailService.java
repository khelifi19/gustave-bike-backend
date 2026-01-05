package fr.univ.eiffel.gustavebike.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    // Method renamed to "sendSimpleMessage" (instead of sendEmail)
    // This matches exactly what the UserController calls.
    public void sendSimpleMessage(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("yassinkhelefi@gmail.com"); // Matches the email configured in application.properties
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            
            mailSender.send(message);
            System.out.println("✅ SUCCESS: Email sent to " + to);
            
        } catch (Exception e) {
            System.err.println("❌ MAIL SEND FAILED: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    // --- 2. NEW METHOD (Used for Support) ---
    public void sendEmailToAdmin(String userEmail, String subject, String content, String userType) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            
            // The technical sender remains your Gmail (for SMTP authentication)
            message.setFrom("yassinkhelefi@gmail.com");
            
            // The recipient is the ADMIN (You)
            message.setTo("yassine.khelifi@edu.univ-eiffel.fr");
            
            // IMPORTANT: "Reply-To"
            // When you receive the email and click "Reply", 
            // it will reply to the user (userEmail), not to your own Gmail.
            message.setReplyTo(userEmail);
            
            message.setSubject("[GUSTAVEBIKE SUPPORT] " + subject);
            
            // Clean message formatting
            String body = "🔔 NEW SUPPORT MESSAGE\n\n";
            body += "👤 From: " + userEmail + " (" + userType + ")\n";
            body += "📝 Subject: " + subject + "\n";
            body += "--------------------------------------------------\n\n";
            body += content + "\n\n";
            body += "--------------------------------------------------\n";
            body += "👉 To reply, simply click 'Reply'.";
            
            message.setText(body);

            mailSender.send(message);
            System.out.println("✅ SUPPORT: Email forwarded to admin for " + userEmail);

        } catch (Exception e) {
            System.err.println("❌ SUPPORT FAILED: " + e.getMessage());
            e.printStackTrace();
            // Re-throw the error to notify the controller
            throw new RuntimeException("Error sending support email");
        }
    }
}