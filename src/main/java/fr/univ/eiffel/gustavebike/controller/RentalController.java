package fr.univ.eiffel.gustavebike.controller;

import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.Invoice;
import fr.univ.eiffel.gustavebike.model.Rental;
import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.repository.BikeRepository;
import fr.univ.eiffel.gustavebike.repository.InvoiceRepository;
import fr.univ.eiffel.gustavebike.repository.RentalRepository;
import fr.univ.eiffel.gustavebike.repository.UserRepository;
import fr.univ.eiffel.gustavebike.service.WaitingListService; // <-- IMPORT DU NOUVEAU SERVICE
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rentals")
@CrossOrigin(origins = "*")
public class RentalController {

    @Autowired private RentalRepository rentalRepository;
    @Autowired private BikeRepository bikeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired 
    private InvoiceRepository invoiceRepository;
    
    // ON REMPLACE WaitingListRepository et EmailService PAR LE SERVICE GLOBAL
    @Autowired private WaitingListService waitingListService;

    // --- 1. CRÉER UNE LOCATION (Code Original Conservé) ---
    @PostMapping
    public ResponseEntity<?> createRental(@RequestBody Map<String, Object> payload) {
        try {
            Long bikeId = Long.valueOf(payload.get("bikeId").toString());
            String userEmail = (String) payload.get("userEmail");
            LocalDate start = LocalDate.parse((String) payload.get("startDate"));
            LocalDate end = LocalDate.parse((String) payload.get("endDate"));
            LocalDate today = LocalDate.now();

            // A. Validation des Dates
            if (start.isBefore(today)) return ResponseEntity.badRequest().body("{\"error\": \"DATE\", \"message\": \"Date passée impossible.\"}");
            if (!end.isAfter(start) && !end.isEqual(start)) return ResponseEntity.badRequest().body("{\"error\": \"DATE\", \"message\": \"Date de fin incorrecte.\"}");

            // B. Vérification de Conflit
            List<Rental> conflicts = rentalRepository.findOverlappingRentals(bikeId, start, end);
            if (!conflicts.isEmpty()) {
                return ResponseEntity.status(409).body("{\"error\": \"CONFLICT\", \"message\": \"Ce vélo est déjà loué sur ces dates.\"}");
            }

            Optional<Bike> bikeOpt = bikeRepository.findById(bikeId);
            Optional<User> userOpt = userRepository.findByEmail(userEmail);

            if (bikeOpt.isPresent() && userOpt.isPresent()) {
                Bike bike = bikeOpt.get();
                User user = userOpt.get();

                Rental rental = new Rental();
                rental.setBike(bike);
                rental.setUser(user);
                rental.setStartDate(start);
                rental.setEndDate(end);
                rental.setTotalPrice(Double.parseDouble(payload.get("totalPrice").toString()));
                
                if (payload.containsKey("deposit")) rental.setDepositAmount(Double.parseDouble(payload.get("deposit").toString()));
                else rental.setDepositAmount(200.0);

                rental.setDelivery((boolean) payload.get("delivery"));
                rental.setDeliveryAddress((String) payload.get("address"));
                rental.setStatus("ACTIVE");

                rentalRepository.save(rental);

                // C. Mise à jour du statut du vélo
                bike.setStatus("RENTED"); 
                bike.setRentCount(bike.getRentCount() + 1);
                bikeRepository.save(bike);
                
                Invoice invoice = new Invoice(
                		 rental.getTotalPrice(), 
                        "RENTAL", 
                        user
                    );
                    invoiceRepository.save(invoice);
                    System.out.println("Facture RENTAL créée : " + invoice.getAmount());

                return ResponseEntity.ok(rental);
            }
            return ResponseEntity.badRequest().body("{\"error\": \"DATA\", \"message\": \"Utilisateur ou Vélo introuvable.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("{\"error\": \"SERVER\", \"message\": \"Erreur technique.\"}");
        }
    }

    // --- 2. VOIR MES LOCATIONS (Code Original Conservé) ---
    @GetMapping("/user/{email}")
    public List<Rental> getUserRentals(@PathVariable String email) {
        return rentalRepository.findByUserEmailOrderByStartDateDesc(email);
    }
    
    @GetMapping("/bike/{bikeId}")
    public List<Rental> getBikeRentals(@PathVariable Long bikeId) {
        return rentalRepository.findByBikeId(bikeId);
    }

    // --- 3. RENDRE UN VÉLO (MODIFIÉ POUR UTILISER LE SERVICE) ---
    @PostMapping("/{id}/return")
    public ResponseEntity<?> returnBike(@PathVariable Long id) {
        Optional<Rental> rentalOpt = rentalRepository.findById(id);
        
        if (rentalOpt.isPresent()) {
            Rental rental = rentalOpt.get();
            if ("FINISHED".equals(rental.getStatus())) return ResponseEntity.badRequest().body("{\"message\": \"Location déjà terminée.\"}");

            // A. Clôture de la location
            rental.setStatus("FINISHED");
            rental.setEndDate(LocalDate.now());
            rentalRepository.save(rental);

            // B. Libération du vélo
            Bike bike = rental.getBike();
            bike.setStatus("AVAILABLE");
            bikeRepository.save(bike);

            // C. DÉCLENCHEMENT DU SERVICE INTELLIGENT
            // C'est cette ligne qui remplace votre ancien bloc manuel.
            // Elle fait appel à WaitingListService pour gérer les PROs, le timer 3h/5h et l'email.
            waitingListService.onBikeAvailable(bike);
            
            return ResponseEntity.ok("{\"message\": \"Vélo rendu avec succès. Liste d'attente notifiée.\"}");
        }
        return ResponseEntity.notFound().build();
    }
}