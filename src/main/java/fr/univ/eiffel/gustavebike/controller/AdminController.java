package fr.univ.eiffel.gustavebike.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.stripe.model.Invoice;

import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.repository.BikeRepository;
import fr.univ.eiffel.gustavebike.repository.InvoiceRepository;
import fr.univ.eiffel.gustavebike.repository.RentalRepository;
import fr.univ.eiffel.gustavebike.repository.UserRepository;
@RestController
// Note : Le frontend cherche /api/users/all et /api/orders/all. 
// On peut soit changer le RequestMapping global, soit définir les routes précisément.
@RequestMapping("/api") 
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired private BikeRepository bikeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RentalRepository rentalRepository;
    @Autowired private InvoiceRepository invoiceRepository;
    
    private static final String UPLOAD_DIR = "src/main/resources/static/uploads/";

    // ==========================================
    // 1. ROUTES MANQUANTES (Correctif 404)
    // ==========================================

    @GetMapping("/users/all")
    public List<User> getAllUsersForAdmin() {
        // On récupère tous les utilisateurs sauf ceux ayant le rôle ADMIN
        return userRepository.findAll().stream()
            .filter(user -> !"ADMIN".equalsIgnoreCase(user.getRole()))
            .collect(Collectors.toList());
    }

    @GetMapping("/orders/all")
    public List<fr.univ.eiffel.gustavebike.model.Invoice> getAllOrders() {
        // Dans votre modèle, les commandes terminées sont représentées par les factures (Invoices)
        return invoiceRepository.findAll();
    }

    // Route pour bannir/débannir (toggle-ban utilisé dans app.js)
    @PutMapping("/users/{userId}/toggle-ban")
    public ResponseEntity<?> toggleUserBan(@PathVariable Long userId) {
        return userRepository.findById(userId).map(user -> {
            // Si vous n'avez pas de champ 'banned', vous pouvez utiliser 'active'
            user.setActive(!user.isActive()); 
            userRepository.save(user);
            return ResponseEntity.ok(user);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ==========================================
    // 2. GESTION DES VÉLOS (ADMIN)
    // ==========================================

    @PostMapping("/admin/add-bike")
    public ResponseEntity<?> addBike(
            @RequestParam(value = "imageFile", required = false) MultipartFile file,
            @RequestParam("model") String model,
            @RequestParam("type") String type,
            @RequestParam("price") Double price,
            @RequestParam("salePrice") Double salePrice,
            @RequestParam("description") String description) {
        try {
            Bike bike = new Bike();
            bike.setModel(model); 
            bike.setType(type); 
            bike.setPrice(price); 
            bike.setSalePrice(salePrice); 
            bike.setDescription(description);
            bike.setStatus("AVAILABLE"); 
            bike.setRentCount(0); 
            
            if (file != null && !file.isEmpty()) saveImage(bike, file);
            bikeRepository.save(bike);
            return ResponseEntity.ok("Vélo ajouté.");
        } catch (Exception e) { return ResponseEntity.status(500).body(e.getMessage()); }
    }

    @PostMapping("/admin/maintenance/{id}")
    public ResponseEntity<?> toggleMaintenance(@PathVariable Long id) {
        return bikeRepository.findById(id).map(bike -> {
            if ("MAINTENANCE".equals(bike.getStatus())) {
                bike.setStatus("AVAILABLE");
            } else {
                bike.setStatus("MAINTENANCE");
            }
            bikeRepository.save(bike);
            return ResponseEntity.ok("Statut mis à jour : " + bike.getStatus());
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/admin/delete/{id}")
    public ResponseEntity<?> deleteBike(@PathVariable Long id) {
        if(bikeRepository.existsById(id)) { 
            // Nettoyage des locations liées
            rentalRepository.findAll().stream()
                .filter(r -> r.getBike().getId().equals(id))
                .forEach(r -> rentalRepository.delete(r));
                
            bikeRepository.deleteById(id); 
            return ResponseEntity.ok("Supprimé"); 
        }
        return ResponseEntity.status(404).build();
    }

    // ==========================================
    // 3. STATISTIQUES & UTILITAIRES
    // ==========================================

    @GetMapping("/admin/stats")
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        List<Bike> bikes = bikeRepository.findAll();
        List<fr.univ.eiffel.gustavebike.model.Invoice> invoices = invoiceRepository.findAll();
        
        // Use mapToDouble instead of flatMapToDouble
        double realRevenue = invoices.stream()
                                     .mapToDouble(fr.univ.eiffel.gustavebike.model.Invoice::getAmount)
                                     .sum();
        
        stats.put("earnings", realRevenue);
        stats.put("total_bikes", bikes.size());
        stats.put("bikes_rented_now", bikes.stream().filter(b -> "RENTED".equals(b.getStatus())).count());
        stats.put("total_users", userRepository.count());
        
        return stats;
    }
    private void saveImage(Bike bike, MultipartFile file) throws IOException {
        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) uploadDir.mkdirs();
        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path path = Paths.get(UPLOAD_DIR + fileName);
        Files.write(path, file.getBytes());
        bike.setImage("http://localhost:8080/uploads/" + fileName);
    }
}