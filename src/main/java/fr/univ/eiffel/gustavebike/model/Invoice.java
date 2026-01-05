package fr.univ.eiffel.gustavebike.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double amount;
    private String type; // "RENTAL", "SALE", "SUBSCRIPTION"
    private LocalDate date;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user; // Lien avec l'utilisateur qui a payé

    // Constructeur vide
    public Invoice() {}

    // Constructeur utile
    public Invoice(Double amount, String type, User user) {
        this.amount = amount;
        this.type = type;
        this.user = user;
        this.date = LocalDate.now();
    }

    // Getters et Setters standard...
    public Double getAmount() { return amount; }
    public String getType() { return type; }
    public LocalDate getDate() { return date; }
}