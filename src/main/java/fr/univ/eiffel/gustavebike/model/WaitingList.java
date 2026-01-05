package fr.univ.eiffel.gustavebike.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class WaitingList {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "bike_id")
    private Bike bike;

    private LocalDateTime requestDate;
    
    // --- NOUVEAUX CHAMPS ---
    private LocalDateTime notifiedAt; // Heure d'envoi du mail

    @Enumerated(EnumType.STRING)
    private Status status; // PENDING, NOTIFIED, EXPIRED, BOOKED

    public enum Status {
        PENDING, NOTIFIED, EXPIRED, BOOKED
    }
    // -----------------------

    public WaitingList() {}

    public WaitingList(User user, Bike bike) {
        this.user = user;
        this.bike = bike;
        this.requestDate = LocalDateTime.now();
        this.status = Status.PENDING; // Par défaut, on est en attente
    }

    // Getters et Setters
    public Long getId() { return id; }
    public User getUser() { return user; }
    public Bike getBike() { return bike; }
    public LocalDateTime getRequestDate() { return requestDate; }
    
    public LocalDateTime getNotifiedAt() { return notifiedAt; }
    public void setNotifiedAt(LocalDateTime notifiedAt) { this.notifiedAt = notifiedAt; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}