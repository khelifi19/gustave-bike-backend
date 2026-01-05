package fr.univ.eiffel.gustavebike.service;

import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.WaitingList;
import fr.univ.eiffel.gustavebike.repository.WaitingListRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class WaitingListService {

    @Autowired private WaitingListRepository repository;
    @Autowired private EmailService emailService; // <-- Injection of the real email service

    // --- ACTION 1: BIKE AVAILABLE ---
    // Automatically called when a bike is returned via RentalController
    public void onBikeAvailable(Bike bike) {
        // Search for the next candidate (Sorted by PRO first, then by seniority)
        List<WaitingList> candidates = repository.findNextInLine(bike.getId());

        if (!candidates.isEmpty()) {
            WaitingList luckyWinner = candidates.get(0);
            
            // Update status and start the timer
            luckyWinner.setStatus(WaitingList.Status.NOTIFIED);
            luckyWinner.setNotifiedAt(LocalDateTime.now());
            repository.save(luckyWinner);

            // Send email
            sendEmail(luckyWinner);
        }
    }

    // --- ACTION 2: AUTOMATIC CHECK (CRON) ---
    // Runs every minute to check if the delay has passed
    @Scheduled(fixedRate = 60000) 
    public void checkTimeouts() {
        List<WaitingList> notifiedUsers = repository.findByStatus(WaitingList.Status.NOTIFIED);
        LocalDateTime now = LocalDateTime.now();

        for (WaitingList entry : notifiedUsers) {
            // Clean retrieval of boolean (no useless null check)
            boolean isPro = entry.getUser().getIsPro(); 
            
            // Business Logic: 5h for Pros, 3h for others
            int hoursLimit = isPro ? 5 : 3;
            LocalDateTime expirationTime = entry.getNotifiedAt().plusHours(hoursLimit);

            // If the delay is exceeded
            if (now.isAfter(expirationTime)) {
                System.out.println("⏳ TIME EXPIRED for " + entry.getUser().getEmail());
                
                // 1. Expire the current user
                entry.setStatus(WaitingList.Status.EXPIRED);
                repository.save(entry);

                // 2. Notify the user they lost their spot (Optional)
                try {
                    emailService.sendSimpleMessage(
                        entry.getUser().getEmail(),
                        "Time Expired",
                        "The reservation time for the bike " + entry.getBike().getModel() + " has expired. It has been offered to the next person."
                    );
                } catch (Exception e) {
                    System.err.println("Error sending expiration email: " + e.getMessage());
                }

                // 3. Trigger the process for the NEXT person
                onBikeAvailable(entry.getBike());
            }
        }
    }

    // --- INTERNAL SENDING METHOD ---
    private void sendEmail(WaitingList w) {
        int hours = w.getUser().getIsPro() ? 5 : 3;
        String email = w.getUser().getEmail();
        String model = w.getBike().getModel();
        
        System.out.println("📧 SENDING EMAIL TO: " + email);

        try {
            emailService.sendSimpleMessage(
                email,
                "🚲 IT'S YOUR TURN: " + model + " Available!",
                "Good news!\n\n" +
                "The bike " + model + " you were waiting for is available.\n" +
                "As a " + (w.getUser().getIsPro() ? "PRO" : "Standard") + " member, you have " + hours + " hours to log in and finalize the rental.\n\n" +
                "After this period, it will be offered to the next person.\n\n" +
                "Log in quickly to GustaveBike!"
            );
        } catch (Exception e) {
            System.err.println("❌ Email sending error: " + e.getMessage());
        }
    }
}