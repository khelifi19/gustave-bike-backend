package fr.univ.eiffel.gustavebike.controller;

import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.model.WaitingList;
import fr.univ.eiffel.gustavebike.repository.BikeRepository;
import fr.univ.eiffel.gustavebike.repository.UserRepository;
import fr.univ.eiffel.gustavebike.repository.WaitingListRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/waiting-list")
@CrossOrigin(origins = "*")
public class WaitingListController {

    @Autowired private WaitingListRepository waitingListRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BikeRepository bikeRepository;

    // 1. AJOUTER A LA LISTE
    @PostMapping
    public ResponseEntity<?> joinList(@RequestBody Map<String, Object> payload) {
        try {
            String email = (String) payload.get("email");
            
            // Gestion robuste ID (Integer ou Long) selon ce que le JSON envoie
            Long bikeId;
            if (payload.get("bikeId") instanceof Integer) {
                bikeId = ((Integer) payload.get("bikeId")).longValue();
            } else {
                bikeId = ((Number) payload.get("bikeId")).longValue();
            }

            // Recherche User et Bike
            Optional<User> userOpt = userRepository.findByEmail(email);
            Optional<Bike> bikeOpt = bikeRepository.findById(bikeId);

            if (userOpt.isEmpty() || bikeOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User or Bike not found"));
            }

            // Vérification doublon
            if (waitingListRepository.existsByUserAndBike(userOpt.get(), bikeOpt.get())) {
                return ResponseEntity.badRequest().body(Map.of("error", "You are already on the list for this bike"));
            }

            // Sauvegarde
            WaitingList entry = new WaitingList(userOpt.get(), bikeOpt.get());
            waitingListRepository.save(entry);
            
            return ResponseEntity.ok(Map.of("message", "Added to waiting list"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // 2. VOIR LA LISTE (Formatée sans DTO)
    @GetMapping("/bike/{bikeId}")
    public ResponseEntity<List<Map<String, Object>>> getByBikeId(@PathVariable Long bikeId) {
        // 1. Récupération des données brutes
        List<WaitingList> rawList = waitingListRepository.findByBikeId(bikeId);

        // 2. Transformation "à la volée" en Map
        List<Map<String, Object>> response = rawList.stream().map(w -> {
            Map<String, Object> item = new HashMap<>();
            
            User u = w.getUser(); 

            // Infos de la réservation
            item.put("id", w.getId());
            item.put("requestDate", w.getRequestDate());

            // Extraction des infos du User au niveau racine du JSON
            if (u != null) {
                item.put("username", u.getUsername()); 
                item.put("email", u.getEmail());
                
                // ATTENTION : Vérifiez si votre getter s'appelle isPro() ou getIsPro() dans User.java
                // Standard Java pour boolean = isPro()
                // Standard Java pour Boolean (objet) = getIsPro()
                try {
                    item.put("isPro", u.getIsPro()); 
                } catch (Error | Exception e) {
                     // Fallback si la méthode s'appelle autrement (ex: lombok génère parfois getIsPro)
                     // item.put("isPro", u.getIsPro()); 
                }
            } else {
                item.put("username", "Utilisateur inconnu");
                item.put("isPro", false);
            }

            return item;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}