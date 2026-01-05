package fr.univ.eiffel.gustavebike.controller;

import java.util.Map;
import java.util.Optional;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import fr.univ.eiffel.gustavebike.model.Invoice;
import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.repository.InvoiceRepository;
import fr.univ.eiffel.gustavebike.repository.UserRepository;
import fr.univ.eiffel.gustavebike.service.EmailService;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EmailService emailService;
    @Autowired 
    private InvoiceRepository invoiceRepository;

    // --- 1. REGISTER ---
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) return ResponseEntity.badRequest().body("{\"error\": \"Fields required.\"}");
        if (userRepository.findByEmail(email).isPresent()) return ResponseEntity.badRequest().body("{\"error\": \"Email already exists.\"}");

        User u = new User(body.get("firstName"), body.get("lastName"), body.get("username"), email, passwordEncoder.encode(password));

        if (email != null && email.endsWith("@edu.univ-eiffel.fr")) {
            u.setRole("STUDENT");
        } else {
            u.setRole("USER");
        }
        
        String code = String.format("%06d", new Random().nextInt(999999));
        u.setVerificationCode(code);
        u.setVerified(false); 

        userRepository.save(u);
        System.out.println("📧 Tentative d'envoi mail à : " + email);

        try {
            emailService.sendSimpleMessage(email, "Validation Code", "Your code: " + code);
        } catch (Exception e) { System.err.println("Mail error: " + e.getMessage()); e.printStackTrace();}

        return ResponseEntity.ok(Map.of("message", "Registration successful.", "email", email));
    }

    // --- 2. LOGIN ---
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam(required = false) String email, @RequestParam(required = false) String password) {
        if (email == null || password == null) return ResponseEntity.badRequest().body("{\"error\": \"Missing fields.\"}");

        Optional<User> uOpt = userRepository.findByEmail(email.trim());

        if (uOpt.isPresent()) {
            User u = uOpt.get();
            if (passwordEncoder.matches(password.trim(), u.getPassword())) {
                if (!u.isVerified() && !"ADMIN".equals(u.getRole())) {
                   return ResponseEntity.status(403).body("{\"error\": \"Account not verified. Check your emails.\"}");
                }
                if (!u.isActive()) { // Check for Ban
                    return ResponseEntity.status(403).body("{\"error\": \"Account banned by admin.\"}");
                }
                return ResponseEntity.ok(u);
            }
        }
        return ResponseEntity.status(401).body("{\"error\": \"Invalid credentials.\"}");
    }

    // --- 3. VERIFY CODE ---
    @PostMapping("/verify")
    public ResponseEntity<?> verifyCode(@RequestBody Map<String, String> body) {
        Optional<User> uOpt = userRepository.findByEmail(body.get("email"));
        if (uOpt.isPresent()) {
            User u = uOpt.get();
            if (body.get("code") != null && body.get("code").trim().equals(u.getVerificationCode())) {
                u.setVerified(true);
                u.setVerificationCode(null);
                userRepository.save(u);
                return ResponseEntity.ok("{\"message\": \"Account verified!\"}");
            }
        }
        return ResponseEntity.status(400).body("{\"error\": \"Invalid code.\"}");
    }

    // --- 4. RESET PASSWORD REQUEST (Fixed Path) ---
    @PostMapping("/reset-password/request")
    public ResponseEntity<?> requestReset(@RequestParam("email") String email) {
        Optional<User> uOpt = userRepository.findByEmail(email);
        if (uOpt.isPresent()) {
            User u = uOpt.get();
            String code = String.format("%06d", new Random().nextInt(999999));
            u.setVerificationCode(code);
            userRepository.save(u);
            try {
                emailService.sendSimpleMessage(email, "Password Reset", "Your code: " + code);
                return ResponseEntity.ok("{\"message\": \"Email sent\"}");
            } catch (Exception e) { return ResponseEntity.status(500).body("Mail error"); }
        }
        return ResponseEntity.status(404).body("Email unknown");
    }

    // --- 5. RESET PASSWORD CONFIRM (Fixed Path) ---
    @PostMapping("/reset-password/confirm")
    public ResponseEntity<?> confirmReset(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        String newPassword = body.get("newPassword");

        if (email == null || code == null || newPassword == null) return ResponseEntity.badRequest().body("{\"error\": \"Missing data.\"}");

        Optional<User> uOpt = userRepository.findByEmail(email);
        if (uOpt.isPresent()) {
            User u = uOpt.get();
            String savedCode = u.getVerificationCode();
            
            if (savedCode != null && savedCode.trim().equals(code.trim())) {
                u.setPassword(passwordEncoder.encode(newPassword));
                u.setVerified(true);
                u.setVerificationCode(null); 
                userRepository.save(u);
                return ResponseEntity.ok("{\"message\": \"Success! You can now login.\"}");
            }
        }
        return ResponseEntity.status(400).body("{\"error\": \"Invalid code.\"}");
    }

    // --- 6. PROFILE UPDATE ---
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body) {
        return userRepository.findByEmail(body.get("email")).map(u -> {
            if(body.containsKey("username")) u.setUsername(body.get("username"));
            if(body.containsKey("phone")) u.setPhone(body.get("phone"));
            if(body.containsKey("address")) u.setAddress(body.get("address"));
            if(body.containsKey("iban")) u.setIban(body.get("iban"));
            if(body.containsKey("password") && !body.get("password").isEmpty()) {
                u.setPassword(passwordEncoder.encode(body.get("password")));
            }
            userRepository.save(u);
            return ResponseEntity.ok(u);
        }).orElse(ResponseEntity.notFound().build());
    }
    
    // --- 7. SUBSCRIBE PRO ---
 // --- 7. SUBSCRIBE PRO (CORRIGÉ) ---
    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribeUser(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String plan = payload.get("plan");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Vérification email universitaire (optionnel selon vos règles)
            if (!user.getEmail().endsWith("@edu.univ-eiffel.fr") && !user.getRole().equals("ADMIN")) {
                return ResponseEntity.status(403).body("Only university emails can subscribe.");
            }
            
            user.setIsPro(true);
            user.setSubscriptionPlan(plan);
            userRepository.save(user);
            
            // --- CORRECTION ICI : DÉFINITION DU PRIX ---
            double price = 0.0;
            if ("MONTHLY".equals(plan)) price = 9.99;
            else if ("QUARTERLY".equals(plan)) price = 24.99;
            else if ("YEARLY".equals(plan)) price = 89.99;
            // -------------------------------------------

            Invoice invoice = new Invoice(price, "SUBSCRIPTION", user);
            invoiceRepository.save(invoice);
            System.out.println("Facture SUBSCRIPTION créée : " + price);
            
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(404).body("User not found");
    }

    // --- 8. BAN/UNBAN USER (Check if AdminController already has this!) ---
    // If you get another "Ambiguous mapping" error, DELETE this method.
    @PutMapping("/{id}/toggle-ban")
    public ResponseEntity<?> toggleBan(@PathVariable Long id) {
        return userRepository.findById(id).map(u -> {
            u.setActive(!u.isActive()); // Switch active status
            userRepository.save(u);
            return ResponseEntity.ok(Map.of("active", u.isActive()));
        }).orElse(ResponseEntity.notFound().build());
    }
}