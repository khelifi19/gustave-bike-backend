package fr.univ.eiffel.gustavebike.config;

import fr.univ.eiffel.gustavebike.model.Accessory;
import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.Review;
import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.repository.AccessoryRepository;
import fr.univ.eiffel.gustavebike.repository.BikeRepository;
import fr.univ.eiffel.gustavebike.repository.ReviewRepository;
import fr.univ.eiffel.gustavebike.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DatabaseInitializer {

    @Bean
    CommandLineRunner initDatabase(BikeRepository bikeRepository,
                                   AccessoryRepository accessoryRepository,
                                   UserRepository userRepository,
                                   ReviewRepository reviewRepository,
                                   PasswordEncoder passwordEncoder) {
        return args -> {
            
            System.out.println("🚀 DÉMARRAGE : Initialisation de la Base de Données...");

            // --- 1. INITIALISATION UTILISATEURS (On vérifie individuellement pour être sûr) ---
            
            if (userRepository.findByEmail("admin").isEmpty()) {
                User admin = new User("Admin", "System", "Admin", "admin", passwordEncoder.encode("admin"));
                admin.setRole("ADMIN");
                admin.setVerified(true);
                admin.setAddress("Bureau 404, Bâtiment Copernic");
                userRepository.save(admin);
                System.out.println("➕ Admin créé");
            }

            if (userRepository.findByEmail("yassine.khelifi@edu.univ-eiffel.fr").isEmpty()) {
                User yassin = new User("Yassin", "khelifi", "khelifi", "yassine.khelifi@edu.univ-eiffel.fr", passwordEncoder.encode("1234"));
                yassin.setRole("STUDENT");
                yassin.setVerified(true);
                yassin.setAddress("12 Rue de la Paix, Paris");
                yassin.setIban("FR76 1234 5678 9011");
                userRepository.save(yassin);
                System.out.println("➕ Yassin créé");
            }
            if (userRepository.findByEmail("wess@edu.univ-eiffel.fr").isEmpty()) {
                User wess = new User("wess", "khelifi", "wess", "wess@edu.univ-eiffel.fr", passwordEncoder.encode("1234"));
              wess.setRole("STUDENT");
              wess.setVerified(true);
              wess.setAddress("12 Rue de la Paix, Paris");
              wess.setIban("FR76 1234 5678 9011");
                userRepository.save(wess);
                System.out.println("➕ wess créé");
            }
            


            // --- 2. INITIALISATION VÉLOS (BLOCK UNIQUE) ---
            // Si la table est vide, on ajoute TOUT le catalogue.
            
            if (bikeRepository.count() == 0) {
                System.out.println("🚲 Base vide : Ajout de tous les vélos...");

                // VÉLO 1
                Bike b1 = new Bike();
                b1.setModel("Rockrider ST 100");
                b1.setType("VTT");
                b1.setPrice(15.0);
                b1.setSalePrice(150.0);
                b1.setOwnerName("Eiffel Corp");
                b1.setRentCount(5);
                b1.setForSale(false);
                b1.setStatus("AVAILABLE");
                b1.setImage("uploads/bikes/1.jpg"); // Modifié
                b1.setDescription("VTT robuste, idéal pour le campus.");
                bikeRepository.save(b1);
                
                
                // VÉLO 2
                Bike b2 = new Bike();
                b2.setModel("Elops Speed 500");
                b2.setType("Ville");
                b2.setPrice(12.0);
                b2.setSalePrice(200.0);
                b2.setOwnerName("yassin");
                b2.setRentCount(0);
                b2.setForSale(false);
                b2.setStatus("AVAILABLE");
                b2.setImage("uploads/bikes/2.jpg"); // Modifié
                b2.setDescription("Mon vélo perso, je le loue quand j'ai cours.");
                bikeRepository.save(b2);

                // VÉLO 3
                Bike b3 = new Bike();
                b3.setModel("Riverside 500 E");
                b3.setType("Electrique");
                b3.setPrice(25.0);
                b3.setSalePrice(800.0);
                b3.setOwnerName("Eiffel Corp");
                b3.setRentCount(12);
                b3.setForSale(true); 
                b3.setStatus("AVAILABLE");
                b3.setImage("uploads/bikes/3.png"); // Modifié
                b3.setDescription("Assistance électrique, parfait pour les côtes.");
                bikeRepository.save(b3);
                
                // VÉLO 4
                Bike b4 = new Bike();
                b4.setModel("B'Twin Original");
                b4.setType("Ville");
                b4.setPrice(8.0);
                b4.setOwnerName("Eiffel Corp");
                b4.setRentCount(20);
                b4.setForSale(false);
                b4.setStatus("RENTED"); 
                b4.setImage("uploads/bikes/4.webp"); // Modifié
                b4.setDescription("Vélo basique très demandé.");
                bikeRepository.save(b4);
                
                // VÉLO 5
                Bike b5 = new Bike();
                b5.setModel("Peugeot Legend LC01");
                b5.setType("Electrique");
                b5.setPrice(14.0);
                b5.setSalePrice(870.0);
                b5.setOwnerName("Eiffel Corp");
                b5.setRentCount(12);
                b5.setForSale(true); 
                b5.setStatus("AVAILABLE");
                b5.setImage("uploads/bikes/5.jpeg"); // Modifié
                b5.setDescription("Vélo vintage électrique, très classe.");
                bikeRepository.save(b5);
                
                // VÉLO 6
                Bike b6 = new Bike();
                b6.setModel("Cannondale Trail 8");
                b6.setType("VTT");
                b6.setPrice(18.0);
                b6.setSalePrice(450.0);
                b6.setOwnerName("yass"); 
                b6.setRentCount(2);
                b6.setForSale(true); 
                b6.setStatus("AVAILABLE");
                b6.setImage("uploads/bikes/6.jpeg"); // Modifié
                b6.setDescription("VTT performant, suspension avant.");
                bikeRepository.save(b6);

                // VÉLO 7
                Bike b7 = new Bike();
                b7.setModel("Moustache Lundi 27");
                b7.setType("Electrique");
                b7.setPrice(35.0);
                b7.setSalePrice(2000.0);
                b7.setOwnerName("Eiffel Corp");
                b7.setRentCount(8);
                b7.setForSale(false);
                b7.setStatus("MAINTENANCE");
                b7.setImage("uploads/bikes/7.jpeg"); // Modifié
                b7.setDescription("Le top de l'électrique français.");
                bikeRepository.save(b7);

                // VÉLO 8
                Bike b8 = new Bike();
                b8.setModel("Triban RC 520");
                b8.setType("Route");
                b8.setPrice(20.0);
                b8.setSalePrice(600.0);
                b8.setOwnerName("Eiffel Corp");
                b8.setRentCount(1);
                b8.setForSale(true); 
                b8.setStatus("AVAILABLE");
                b8.setImage("uploads/bikes/8.jpeg"); // Modifié
                b8.setDescription("Vélo de route pour les amateurs de vitesse.");
                bikeRepository.save(b8);
                
                // VÉLO 9
                Bike b9 = new Bike();
                b9.setModel("Brompton C Line");
                b9.setType("Pliant");
                b9.setPrice(15.0);
                b9.setSalePrice(1200.0);
                b9.setOwnerName("Sophie (Prof)");
                b9.setRentCount(3);
                b9.setForSale(true); 
                b9.setStatus("AVAILABLE");
                b9.setImage("uploads/bikes/9.jpeg"); // Modifié
                b9.setDescription("Le roi des vélos pliants.");
                bikeRepository.save(b9);

                // VÉLO 10
                Bike b10 = new Bike();
                b10.setModel("Elops Longtail R500");
                b10.setType("Cargo");
                b10.setPrice(30.0);
                b10.setSalePrice(2500.0);
                b10.setOwnerName("Eiffel Corp");
                b10.setRentCount(15);
                b10.setForSale(false);
                b10.setStatus("AVAILABLE");
                b10.setImage("uploads/bikes/10.jpeg"); // Modifié
                b10.setDescription("Pour transporter des courses ou du matériel lourd.");
                bikeRepository.save(b10);
                
                System.out.println("✅ 10 Vélos ajoutés avec succès !");
            } else {
                System.out.println("ℹ️ La base de vélos n'est pas vide (" + bikeRepository.count() + " vélos). Pas d'initialisation.");
            }

            // --- 3. INITIALISATION ACCESSOIRES ---
            
            if (accessoryRepository.count() == 0) {
                System.out.println("⛑️ Base Accessoires vide : Ajout des accessoires...");
                
                // Chemins modifiés ci-dessous :
                accessoryRepository.save(new Accessory("Casque Bol 500", "Sécurité", 25.0, "uploads/accessoires/1.jpg", "Protection urbaine stylée."));
                accessoryRepository.save(new Accessory("Casque Bol 900", "Sécurité", 29.0, "uploads/accessoires/2.avif", "Protection urbaine stylée."));
                accessoryRepository.save(new Accessory("Casque VTT", "Sécurité", 34.0, "uploads/accessoires/3.jpg", "Aéré et léger."));
                accessoryRepository.save(new Accessory("Casque Enfant", "Sécurité", 32.0, "uploads/accessoires/4.jpg", "Coloré et sûr."));
                accessoryRepository.save(new Accessory("Antivol U 900", "Sécurité", 35.0, "uploads/accessoires/5.webp", "Niveau de sécurité 8/10."));
                accessoryRepository.save(new Accessory("Antivol Chaine", "Sécurité", 35.0, "uploads/accessoires/6.avif", "Niveau de sécurité 9/10."));
                accessoryRepository.save(new Accessory("Sacoche Double", "Confort", 15.0, "uploads/accessoires/7.jpg", "Pour transporter vos cours."));
                accessoryRepository.save(new Accessory("Sacoche Double", "Confort", 15.0, "uploads/accessoires/8.webp", "Grande capacité."));
                
                System.out.println("✅ Accessoires ajoutés !");
            } else {
                System.out.println("ℹ️ Accessoires déjà présents.");
            }
            
            System.out.println("🏁 Initialisation terminée.");
        };
    }
}