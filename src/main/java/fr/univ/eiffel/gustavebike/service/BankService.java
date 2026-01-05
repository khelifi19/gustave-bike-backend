package fr.univ.eiffel.gustavebike.service;

import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class BankService {
    // Simule une validation bancaire
    public String processPayment(String creditCard, double amount) {
        if (creditCard == null || creditCard.length() < 10) {
            throw new IllegalArgumentException("Carte invalide !");
        }
        // On génère un faux ID de transaction
        return UUID.randomUUID().toString();
    }
}