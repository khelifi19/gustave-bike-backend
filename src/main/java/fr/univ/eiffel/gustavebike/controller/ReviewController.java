package fr.univ.eiffel.gustavebike.controller;

import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.Rental;
import fr.univ.eiffel.gustavebike.model.Review;
import fr.univ.eiffel.gustavebike.repository.BikeRepository;
import fr.univ.eiffel.gustavebike.repository.RentalRepository;
import fr.univ.eiffel.gustavebike.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate; // <--- IMPORT AJOUTÉ
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    @Autowired private ReviewRepository reviewRepository;
    @Autowired private RentalRepository rentalRepository;
    @Autowired private BikeRepository bikeRepository;

    @GetMapping("/{bikeId}")
    public List<Review> getBikeReviews(@PathVariable Long bikeId) {
        return reviewRepository.findByBikeId(bikeId);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addReview(@RequestBody Map<String, Object> payload) {
        try {
            Long bikeId = Long.valueOf(payload.get("bikeId").toString());
            String userEmail = (String) payload.get("userEmail");
            String content = (String) payload.get("content");
            int rating = Integer.parseInt(payload.get("rating").toString());
            String authorName = (String) payload.get("authorName");

            // 1. SÉCURITÉ : L'utilisateur DOIT avoir loué et fini la location
            // (Si vous voulez tester plus facilement sans louer, commentez ce bloc)
            List<Rental> history = rentalRepository.findByUserEmailOrderByStartDateDesc(userEmail);
            boolean hasRented = history.stream()
                    .anyMatch(r -> r.getBike().getId().equals(bikeId) && "FINISHED".equals(r.getStatus()));

            if (!hasRented) {
                return ResponseEntity.status(403).body("{\"error\": \"Action refusée : Vous n'avez pas loué ce vélo (ou la location n'est pas terminée).\"}");
            }

            Optional<Bike> bikeOpt = bikeRepository.findById(bikeId);
            if (bikeOpt.isPresent()) {
                // --- CORRECTION ICI : ON UTILISE LE NOUVEAU CONSTRUCTEUR ---
                Review review = new Review(
                    bikeOpt.get(), 
                    authorName, 
                    userEmail,      // Ajouté
                    rating, 
                    content, 
                    LocalDate.now() // Ajouté (Date du jour)
                );
                // -----------------------------------------------------------
                
                reviewRepository.save(review);
                return ResponseEntity.ok(review);
            }
            return ResponseEntity.badRequest().body("Vélo introuvable");
        } catch (Exception e) {
            e.printStackTrace(); // Utile pour voir l'erreur dans la console Eclipse
            return ResponseEntity.status(500).body("Erreur technique : " + e.getMessage());
        }
    }
}