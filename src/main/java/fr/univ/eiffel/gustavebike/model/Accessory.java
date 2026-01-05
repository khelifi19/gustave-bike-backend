package fr.univ.eiffel.gustavebike.model;

import jakarta.persistence.*;

@Entity
public class Accessory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String category; // Ex: Casque, Antivol, Gourde
    private double price;

    // --- CORRECTION ESSENTIELLE ---
    // Permet de stocker les images en Base64 et les longues descriptions
    @Column(columnDefinition = "LONGTEXT")
    private String image;

    @Column(columnDefinition = "LONGTEXT")
    private String description;
    
    // Constructeurs
    public Accessory() {}
    
    public Accessory(String name, String category, double price, String image, String description) {
        this.name = name;
        this.category = category;
        this.price = price;
        this.image = image;
        this.description = description;
    }

    // --- GETTERS ---
    public Long getId() { return id; }
    public String getName() { return name; }
    public double getPrice() { return price; }
    public String getCategory() { return category; }
    public String getImage() { return image; }
    public String getDescription() { return description; }

    // --- SETTERS (Indispensables pour JPA/Hibernate) ---
    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setPrice(double price) { this.price = price; }
    public void setCategory(String category) { this.category = category; }
    public void setImage(String image) { this.image = image; }
    public void setDescription(String description) { this.description = description; }
}