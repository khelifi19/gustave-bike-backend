package fr.univ.eiffel.gustavebike;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.univ.eiffel.gustavebike.model.Accessory;
import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.Review;
import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.repository.AccessoryRepository;
import fr.univ.eiffel.gustavebike.repository.BikeRepository;
import fr.univ.eiffel.gustavebike.repository.ReviewRepository;
import fr.univ.eiffel.gustavebike.repository.UserRepository;

@SpringBootApplication
@EnableScheduling
public class GustaveBikeApplication {

    public static void main(String[] args) {
        SpringApplication.run(GustaveBikeApplication.class, args);
    }

    @Bean
    public CommandLineRunner demo(BikeRepository bikeRepository,
                                  AccessoryRepository accessoryRepository,
                                  UserRepository userRepository,
                                  ReviewRepository reviewRepository,
                                  PasswordEncoder passwordEncoder) {
        return (args) -> {
            
            // --- 1. INITIALISATION UTILISATEURS ---
            if (userRepository.count() == 0) {
                System.out.println("👤 CRÉATION DES UTILISATEURS DÉMO...");

                // Admin
                User admin = new User("Admin", "System", "Admin", "admin", passwordEncoder.encode("admin")); // Login simplifié
                admin.setRole("ADMIN");
                admin.setVerified(true);
                admin.setAddress("Bureau 404, Bâtiment Copernic");
                userRepository.save(admin);

                // Étudiant (Jean)
                User yassin = new User("Yassin", "khelifi", "khelifi", "yassine.khelifi@edu.univ-eiffel.fr", passwordEncoder.encode("1234"));
                yassin.setRole("STUDENT");
                yassin.setVerified(true);
                yassin.setAddress("12 Rue de la Paix, Paris");
                yassin.setIban("FR76 1234 5678 9011"); // Prêt à vendre
                userRepository.save(yassin);
            }

            // --- 2. INITIALISATION VÉLOS (SCÉNARIO) ---
            if (bikeRepository.count() == 0) {
                System.out.println("🚲 CRÉATION DES VÉLOS AVEC RÈGLES MÉTIER...");

                // VÉLO 1 : Eiffel Corp - Loué 5 fois - Pas encore en vente
                Bike b1 = new Bike();
                b1.setModel("Rockrider ST 100");
                b1.setType("VTT");
                b1.setPrice(15.0);
                b1.setSalePrice(150.0);
                b1.setOwnerName("Eiffel Corp");
                b1.setRentCount(5); // A déjà été loué ! (Donc vendable)
                b1.setForSale(false);
                b1.setStatus("AVAILABLE");
                b1.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/1.jpg");
                b1.setDescription("VTT robuste, idéal pour le campus.");
                bikeRepository.save(b1);

                

                // VÉLO 2 : Appartenant à Jean (Étudiant) - Jamais loué
                Bike b2 = new Bike();
                b2.setModel("Elops Speed 500");
                b2.setType("Ville");
                b2.setPrice(12.0);
                b2.setSalePrice(200.0);
                b2.setOwnerName("yassin");
                b2.setRentCount(0); // Jamais loué ! (Donc bouton 'Vendre' sera bloqué)
                b2.setForSale(false);
                b2.setStatus("AVAILABLE");
                b2.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/2.jpg");
                b2.setDescription("Mon vélo perso, je le loue quand j'ai cours.");
                bikeRepository.save(b2);

                // VÉLO 3 : Electrique - Déjà en vente
                Bike b3 = new Bike();
                b3.setModel("Riverside 500 E");
                b3.setType("Electrique");
                b3.setPrice(25.0);
                b3.setSalePrice(800.0);
                b3.setOwnerName("Eiffel Corp");
                b3.setRentCount(12);
                b3.setForSale(true); // DÉJÀ EN VENTE
                b3.setStatus("AVAILABLE");
                b3.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/3.png");
                b3.setDescription("Assistance électrique, parfait pour les côtes.");
                bikeRepository.save(b3);
                
                // VÉLO 4 : Loué actuellement (Test File d'attente)
                Bike b4 = new Bike();
                b4.setModel("B'Twin Original");
                b4.setType("Ville");
                b4.setPrice(8.0);
                b4.setOwnerName("Eiffel Corp");
                b4.setRentCount(20);
                b4.setStatus("RENTED"); // Indisponible
                b4.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/4.webp");
                b4.setDescription("Vélo basique très demandé.");
                bikeRepository.save(b4);
                
             // VÉLO 5 : Electrique - Déjà en vente
                Bike b5 = new Bike();
                b5.setModel("Peugeot Legend LC01");
                b5.setType("Electrique");
                b5.setPrice(14.0);
                b5.setSalePrice(870.0);
                b5.setOwnerName("Eiffel Corp");
                b5.setRentCount(12);
                b5.setForSale(true); // DÉJÀ EN VENTE
                b5.setStatus("AVAILABLE");
                b5.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/5.jpeg");
                b5.setDescription("VTT performant, suspension avant, quelques rayures.");
                bikeRepository.save(b5);
                
                Bike b6 = new Bike();
                b6.setModel("Cannondale Trail 8");
                b6.setType("VTT");
                b6.setPrice(18.0);
                b6.setSalePrice(450.0);
                b6.setOwnerName("yass");
                b6.setRentCount(2);
                b6.setForSale(true); // Il veut le vendre !
                b6.setStatus("AVAILABLE");
                b6.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/6.jpeg");
                b6.setDescription("VTT performant, suspension avant, quelques rayures.");
                bikeRepository.save(b6);

             // --- VÉLO 7 : Électrique Haut de Gamme (Flotte Officielle) ---
                Bike b7 = new Bike();
                b7.setModel("Moustache Lundi 27");
                b7.setType("Electrique");
                b7.setPrice(35.0); // Plus cher car haut de gamme
                b7.setSalePrice(2000.0);
                b7.setOwnerName("Eiffel Corp");
                b7.setRentCount(8);
                b7.setForSale(false);
                b7.setStatus("MAINTENANCE"); // Test pour voir s'il est masqué
                b7.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/7.jpeg");
                b7.setDescription("Le top de l'électrique français. Autonomie 80km.");
                bikeRepository.save(b7);
             // --- VÉLO 8 : Route / Course (Proprio: Admin Perso) ---
                Bike b8 = new Bike();
                b8.setModel("Triban RC 520");
                b8.setType("Route");
                b8.setPrice(20.0);
                b8.setSalePrice(600.0);
                b8.setOwnerName("Eiffel Corp");
                b8.setRentCount(1);
                b8.setForSale(true);
                b8.setStatus("AVAILABLE");
                b8.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/8.jpeg");
                b8.setDescription("Vélo de route pour les amateurs de vitesse. Freins à disque.");
                bikeRepository.save(b8);
                
             // --- VÉLO 9 : Vélo Pliant (Idéal pour le train/RER) ---
                Bike b9 = new Bike();
                b9.setModel("Brompton C Line");
                b9.setType("Pliant");
                b9.setPrice(15.0);
                b9.setSalePrice(1200.0);
                b9.setOwnerName("Sophie (Prof)"); // Un prof qui loue
                b9.setRentCount(3);
                b9.setForSale(true); // Elle le vend aussi
                b9.setStatus("AVAILABLE");
                b9.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/9.jpeg");
                b9.setDescription("Le roi des vélos pliants. Tient sous un bureau.");
                bikeRepository.save(b9);

                // --- VÉLO 10 : Vélo Cargo Longtail (Flotte Officielle) ---
                Bike b10 = new Bike();
                b10.setModel("Elops Longtail R500");
                b10.setType("Cargo");
                b10.setPrice(30.0); // Location chère car gros vélo
                b10.setSalePrice(2500.0);
                b10.setOwnerName("Eiffel Corp");
                b10.setRentCount(15);
                b10.setForSale(false);
                b10.setStatus("AVAILABLE");
                b10.setImage("/gustave-bike-backend/src/main/resources/static/uploads/bikes/10.jpeg");
                b10.setDescription("Pour transporter des courses ou du matériel lourd.");
                bikeRepository.save(b10);
                
                System.out.println("✅ Vélos ajoutés !");
            }

            // --- 3. INITIALISATION ACCESSOIRES ---
            if (accessoryRepository.count() == 0) {
                System.out.println("⛑️ CRÉATION DES ACCESSOIRES...");
                
                accessoryRepository.save(new Accessory("Casque Bol 500", "Sécurité", 25.0, "/gustave-bike-backend/src/main/resources/static/uploads/accessoires/1.jpg", "Protection urbaine stylée."));
                accessoryRepository.save(new Accessory("Casque Bol 900", "Sécurité", 29.0, "/gustave-bike-backend/src/main/resources/static/uploads/accessoires/2.avif", "Protection urbaine stylée."));
                accessoryRepository.save(new Accessory("Casque Bol 500", "Sécurité", 34.0, "/gustave-bike-backend/src/main/resources/static/uploads/accessoires/3.jpg", "Protection urbaine stylée."));
                accessoryRepository.save(new Accessory("Casque Bol 500", "Sécurité", 32.0, "/gustave-bike-backend/src/main/resources/static/uploads/accessoires/4.jpg", "Protection urbaine stylée."));
                accessoryRepository.save(new Accessory("Antivol U 900", "Sécurité", 35.0, "/gustave-bike-backend/src/main/resources/static/uploads/accessoires/5.webp", "Niveau de sécurité 8/10."));
                accessoryRepository.save(new Accessory("Antivol U 900", "Sécurité", 35.0, "/gustave-bike-backend/src/main/resources/static/uploads/accessoires/6.avif", "Niveau de sécurité 9/10."));
                accessoryRepository.save(new Accessory("Sacoche Double", "Confort", 15.0, "/gustave-bike-backend/src/main/resources/static/uploads/accessoires/7.jpg", "Pour transporter vos cours."));
                accessoryRepository.save(new Accessory("Sacoche Double", "Confort", 15.0, "/gustave-bike-backend/src/main/resources/static/uploads/accessoires/8.webp", "Pour transporter vos cours."));
                
                System.out.println("✅ Accessoires ajoutés !");
            }
        };
    }
}