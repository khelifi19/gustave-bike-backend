package fr.univ.eiffel.gustavebike.model;

import jakarta.persistence.*;

@Entity
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String email;
    private String password;
    private String role; // ADMIN, STUDENT, PRO

    // CRM
    private String firstName;
    private String lastName;
    private String phone;
    private String address;
    private String city;
    
    // NOUVEAU : Indispensable pour la vente de vélos
    private String iban; 
    
    private boolean active = true;
    private String verificationCode;
    private boolean verified = false; 
    
    private boolean isPro = false; // Par défaut, personne n'est pro
    private String subscriptionPlan;

    public User() {}

    public User(String firstName, String lastName, String username, String email, String password) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.username = username;
        this.email = email;
        this.password = password;
    }

    // GETTERS & SETTERS
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getVerificationCode() { return verificationCode; }
    public void setVerificationCode(String verificationCode) { this.verificationCode = verificationCode; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    
    // Le Setter manquant :
    public String getIban() { return iban; }
    public void setIban(String iban) { this.iban = iban; }
    public boolean getIsPro() { return isPro; } // Important: le getter doit s'appeler getIsPro ou isPro pour le JSON
    public void setIsPro(boolean isPro) { this.isPro = isPro; }

    public String getSubscriptionPlan() { return subscriptionPlan; }
    public void setSubscriptionPlan(String subscriptionPlan) { this.subscriptionPlan = subscriptionPlan; }
    
}