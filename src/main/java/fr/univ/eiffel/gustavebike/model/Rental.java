package fr.univ.eiffel.gustavebike.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Rental {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "bike_id")
    private Bike bike;

    private LocalDate startDate;
    private LocalDate endDate;
    
    private double totalPrice; // Prix de la location (+ livraison)
    
    // --- NOUVEAU CHAMP ---
    private double depositAmount; // Montant de la caution
    
    private boolean delivery;
    private String deliveryAddress;
    private String status = "ACTIVE";

    public Rental() {}

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Bike getBike() { return bike; }
    public void setBike(Bike bike) { this.bike = bike; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(double totalPrice) { this.totalPrice = totalPrice; }
    
    // --- GETTER & SETTER CAUTION ---
    public double getDepositAmount() { return depositAmount; }
    public void setDepositAmount(double depositAmount) { this.depositAmount = depositAmount; }
    
    public boolean isDelivery() { return delivery; }
    public void setDelivery(boolean delivery) { this.delivery = delivery; }
    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}