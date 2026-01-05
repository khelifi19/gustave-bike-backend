package fr.univ.eiffel.gustavebike.controller;

import fr.univ.eiffel.gustavebike.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/support")
@CrossOrigin(origins = "*") // Allows access from the frontend
public class SupportController {

    @Autowired
    private EmailService emailService;

    // FIX: Added "/contact" to match the frontend URL
    @PostMapping("/contact") 
    public Map<String, String> receiveMessage(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String subject = payload.get("subject");
        String message = payload.get("message");
        String type = payload.get("userType");

        try {
            // Sending the actual email via your service
            emailService.sendEmailToAdmin(email, subject, message, type);
            
            // Return success message in English
            return Map.of("message", "Email sent successfully to administration.");
        } catch (Exception e) {
            e.printStackTrace();
            // Return error message in English
            throw new RuntimeException("Error while sending email");
        }
    }
}