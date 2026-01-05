package fr.univ.eiffel.gustavebike.service;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

@Service
public class CurrencyService {

    // Taux de change statiques (Simule une API externe)
    private static final Map<String, Double> EXCHANGE_RATES = Map.of(
        "EUR", 1.0,    // Base
        "USD", 1.09,   // Dollar Américain
        "GBP", 0.85,   // Livre Sterling
        "JPY", 163.50, // Yen Japonais
        "CHF", 0.95    // Franc Suisse
    );

    public BigDecimal convert(BigDecimal amountInEur, String targetCurrency) {
        // 1. Vérifier si la devise existe
        if (!EXCHANGE_RATES.containsKey(targetCurrency.toUpperCase())) {
            throw new IllegalArgumentException("Devise inconnue : " + targetCurrency);
        }

        // 2. Récupérer le taux
        Double rate = EXCHANGE_RATES.get(targetCurrency.toUpperCase());

        // 3. Calculer : Montant * Taux
        BigDecimal converted = amountInEur.multiply(BigDecimal.valueOf(rate));

        // 4. Arrondir à 2 chiffres après la virgule
        return converted.setScale(2, RoundingMode.HALF_UP);
    }
}