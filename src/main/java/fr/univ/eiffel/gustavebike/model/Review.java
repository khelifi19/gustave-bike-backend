package fr.univ.eiffel.gustavebike.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "bike_id")
    private Bike bike;

    private String authorName; 
    private String userEmail; // <--- AJOUT IMPORTANT
    private String content;    
    private int rating;        
    private LocalDate date;

    public Review() {}

    // --- CONSTRUCTEUR UTILISÉ PAR DATABASE INITIALIZER ---
    // (L'ordre des arguments correspond maintenant exactement à l'erreur)
    public Review(Bike bike, String authorName, String userEmail, int rating, String content, LocalDate date) {
        this.bike = bike;
        this.authorName = authorName;
        this.userEmail = userEmail;
        this.rating = rating;
        this.content = content;
        this.date = date;
    }

    // --- GETTERS ET SETTERS ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Bike getBike() { return bike; }
    public void setBike(Bike bike) { this.bike = bike; }
    
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    
    public String getUserEmail() { return userEmail; } // <--- Getter Ajouté
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; } // <--- Setter Ajouté
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
}