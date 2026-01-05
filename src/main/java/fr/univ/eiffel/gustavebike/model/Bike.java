package fr.univ.eiffel.gustavebike.model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore; // <--- C'est lui le sauveur
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
public class Bike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String model;
    private double price;

    // --- CORRECTION 1 : STOPPER LA BOUCLE INFINIE ---
    // On utilise @JsonIgnore pour dire à Java : "Ne transforme pas ça en JSON"
    // Cela empêche le serveur de planter (Erreur 500)
    
    @OneToMany(mappedBy = "bike", cascade = CascadeType.ALL)
    @JsonIgnore 
    private List<Review> reviews;

    @OneToMany(mappedBy = "bike", cascade = CascadeType.ALL)
    @JsonIgnore 
    private List<Rental> rentals; // On remet cette liste pour la logique métier

    @Column(columnDefinition = "LONGTEXT") 
    private String image;

    private String description;
    private String ownerName;
    private String status; // AVAILABLE, RENTED, MAINTENANCE, SOLD
    private int rentCount;

    // --- CORRECTION 2 : BOUTON "FOR SALE" ---
    @Column(name = "for_sale") 
    @JsonProperty("forSale")    
    private boolean forSale;

    private double salePrice;
    private String type; 
    
    @Transient 
    private boolean ownerIsPro;

    public Bike() {}

    // --- GETTERS ET SETTERS ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public List<Review> getReviews() { return reviews; }
    public void setReviews(List<Review> reviews) { this.reviews = reviews; }
    
    public List<Rental> getRentals() { return rentals; }
    public void setRentals(List<Rental> rentals) { this.rentals = rentals; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getRentCount() { return rentCount; }
    public void setRentCount(int rentCount) { this.rentCount = rentCount; }

    public boolean isForSale() { return forSale; }
    public void setForSale(boolean forSale) { this.forSale = forSale; }

    public double getSalePrice() { return salePrice; }
    public void setSalePrice(double salePrice) { this.salePrice = salePrice; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    // Petite correction de nommage standard (getOwnerIsPro est plus propre que isOwnerIsPro)
    public boolean getOwnerIsPro() { return ownerIsPro; }
    public void setOwnerIsPro(boolean ownerIsPro) { this.ownerIsPro = ownerIsPro; }
}