package fr.univ.eiffel.gustavebike.controller;

import fr.univ.eiffel.gustavebike.model.Accessory;
import fr.univ.eiffel.gustavebike.model.Invoice;
import fr.univ.eiffel.gustavebike.repository.AccessoryRepository;
import fr.univ.eiffel.gustavebike.repository.InvoiceRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/accessories")
@CrossOrigin(origins = "*")
public class AccessoryController {

    @Autowired
    private AccessoryRepository accessoryRepository;
    @Autowired 
    private InvoiceRepository invoiceRepository;
    // 1. Lire tout
    @GetMapping
    public List<Accessory> getAllAccessories() {
        return accessoryRepository.findAll();
    }

    // 2. Ajouter ou Modifier (Si l'ID est dans le JSON, ça modifie)
    @PostMapping
    public Accessory saveAccessory(@RequestBody Accessory accessory) {
        return accessoryRepository.save(accessory);
    }

    // 3. Supprimer
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAccessory(@PathVariable Long id) {
        if (accessoryRepository.existsById(id)) {
            accessoryRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
        }
        return ResponseEntity.notFound().build();
    }
    
 // --- 4. ACHETER SANS SUPPRIMER (Nouveau Endpoint) ---
    @PostMapping("/buy/{id}")
    public ResponseEntity<?> buyAccessory(@PathVariable Long id) {
        Optional<Accessory> accOpt = accessoryRepository.findById(id);

        if (accOpt.isPresent()) {
            Accessory acc = accOpt.get();

            // 1. On enregistre la vente (L'argent rentre)
            Invoice invoice = new Invoice(acc.getPrice(), "SALE", null);
            invoiceRepository.save(invoice);
            
            System.out.println("💰 Accessoire vendu (Stock conservé) : " + acc.getPrice() + "€");

            // 2. On NE SUPPRIME PAS l'accessoire.
            // (Optionnel : Ici vous pourriez décrémenter une quantité si vous aviez un champ 'stock')
            
            return ResponseEntity.ok(Map.of("message", "Purchase successful"));
        }
        
        return ResponseEntity.notFound().build();
    }
}