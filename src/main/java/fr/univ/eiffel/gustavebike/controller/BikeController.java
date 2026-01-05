package fr.univ.eiffel.gustavebike.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.model.Invoice; // <--- 1. AJOUT IMPORT
import fr.univ.eiffel.gustavebike.repository.BikeRepository;
import fr.univ.eiffel.gustavebike.repository.UserRepository;
import fr.univ.eiffel.gustavebike.repository.InvoiceRepository; // <--- 1. AJOUT IMPORT
import fr.univ.eiffel.gustavebike.service.EmailService;

@RestController
@RequestMapping("/api/bikes")
@CrossOrigin(origins = "*")
public class BikeController {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BikeRepository bikeRepository;
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private InvoiceRepository invoiceRepository; // <--- 2. AJOUT INJECTION

    @GetMapping
    public List<Bike> getAllBikes() {
        List<Bike> bikes = bikeRepository.findAll();
        
        for (Bike bike : bikes) {
            Optional<User> ownerOpt = userRepository.findByUsername(bike.getOwnerName());
            if (ownerOpt.isPresent()) {
                bike.setOwnerIsPro(ownerOpt.get().getIsPro());
            }
            if ("ADMIN".equals(bike.getOwnerName()) || "GustaveBike".equals(bike.getOwnerName())) {
                bike.setOwnerIsPro(true);
            }
        }
        
        return bikes;
    }

    @PostMapping
    public ResponseEntity<?> createOrUpdateBike(@RequestBody Bike bike) {
        try {
            System.out.println("📥 REÇU Vélo ID: " + bike.getId() + " | Statut: " + bike.getStatus());

            // 1. UPDATE EXISTING BIKE
            if (bike.getId() != null) {
                Optional<Bike> existingBikeOpt = bikeRepository.findById(bike.getId());
                
                if (existingBikeOpt.isPresent()) {
                    Bike dbBike = existingBikeOpt.get();
                    
                    dbBike.setModel(bike.getModel());
                    dbBike.setPrice(bike.getPrice());
                    dbBike.setImage(bike.getImage());
                    dbBike.setStatus(bike.getStatus());
                    dbBike.setForSale(bike.isForSale()); 

                    dbBike.setType(bike.getType());
                    dbBike.setDescription(bike.getDescription());
                    
                    bikeRepository.save(dbBike);

                    // --- 3. AJOUTER CE BLOC ICI (POUR LA FACTURE) ---
                    if ("SOLD".equals(dbBike.getStatus())) {
                        // Création de la facture de vente
                        // Note: User est null ici car on ne l'a pas dans le body, 
                        // mais ça permet d'avoir le revenu dans le dashboard.
                        Invoice invoice = new Invoice(dbBike.getPrice(), "SALE", null);
                        invoiceRepository.save(invoice);
                        System.out.println("💰 Facture SALE générée : " + dbBike.getPrice() + "€");
                    }
                    // ------------------------------------------------

                    System.out.println("✅ UPDATE SUCCESS for ID: " + bike.getId());
                    return ResponseEntity.ok(dbBike);
                } 
            }

            // 2. CREATE NEW BIKE
            if (bike.getStatus() == null) bike.setStatus("AVAILABLE");
            bike.setRentCount(0);
            
            Bike newBike = bikeRepository.save(bike);
            System.out.println("✨ CREATION SUCCESS. New ID: " + newBike.getId());
            return ResponseEntity.ok(newBike);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Server Error: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bike> getBikeById(@PathVariable Long id) {
        return bikeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    // GESTION DES PROPOSITIONS DE VENTE (ADMIN)
    @PutMapping("/proposals/{id}")
    public ResponseEntity<?> processProposal(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        return bikeRepository.findById(id).map(bike -> {
            String status = (String) data.get("status"); 

            if ("ACCEPT".equals(status)) {
                bike.setStatus("AVAILABLE"); 
                bike.setOwnerName("Eiffel Corp");
                bike.setForSale(false); 
                
                if (data.containsKey("rentalPrice")) {
                    Double newRentalPrice = Double.parseDouble(data.get("rentalPrice").toString());
                    bike.setPrice(newRentalPrice); 
                }
                
                bikeRepository.save(bike);
                userRepository.findByUsername(bike.getOwnerName()).ifPresent(user -> {
                    try {
                        emailService.sendSimpleMessage(
                            user.getEmail(), 
                            "Bike Purchased - GustaveBike", 
                            "Hello " + user.getUsername() + ",\n\n" +
                            "We have accepted your offer for the model: " + bike.getModel() + ".\n" +
                            "The payment has been triggered to your account.\n\n" +
                            "Thank you."
                        );
                    } catch (Exception e) {
                        System.err.println("Email error: " + e.getMessage());
                    }
                });
            } else if ("REFUSE".equals(status)) {
                bike.setStatus("REFUSED");
            }
            
            bikeRepository.save(bike);
            return ResponseEntity.ok(Map.of("message", "Proposal updated", "status", bike.getStatus()));
        }).orElse(ResponseEntity.notFound().build());
    }
}