package fr.univ.eiffel.gustavebike.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;

import fr.univ.eiffel.gustavebike.model.Invoice;
import fr.univ.eiffel.gustavebike.repository.InvoiceRepository;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Value("${stripe.api.key}")
    private String stripeApiKey;
    
    @Autowired
    private InvoiceRepository invoiceRepository;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
    }

    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody Map<String, Object> paymentInfo) {
        try {
            // 1. Récupération du montant
            Double amountDouble = Double.parseDouble(paymentInfo.get("amount").toString());
            Long amountInCents = (long) (amountDouble * 100);

            // 2. Récupération dynamique de la devise (Défaut : EUR)
            String currency = (String) paymentInfo.getOrDefault("currency", "eur");

            // 3. Création de l'intention de paiement avec la bonne devise
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency(currency.toLowerCase()) // Important : Stripe attend "usd", "eur", etc.
                    .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                            .setEnabled(true)
                            .build()
                    )
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);

            Map<String, String> responseData = new HashMap<>();
            responseData.put("clientSecret", intent.getClientSecret());
            
            return ResponseEntity.ok(responseData);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/history")
    public List<Invoice> getAllInvoices() {
        // Récupère tout l'historique pour le Dashboard Admin
        return invoiceRepository.findAll();
    }
}