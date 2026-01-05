package fr.univ.eiffel.gustavebike.service;

import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.Rental;
import fr.univ.eiffel.gustavebike.model.WaitingList;
import fr.univ.eiffel.gustavebike.repository.BikeRepository;
import fr.univ.eiffel.gustavebike.repository.RentalRepository;
import fr.univ.eiffel.gustavebike.repository.WaitingListRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class RentalScheduler {

    @Autowired private RentalRepository rentalRepository;
    @Autowired private BikeRepository bikeRepository;
    @Autowired private WaitingListRepository waitingListRepository;
    @Autowired private EmailService emailService; // Assurez-vous d'avoir ce service

    // S'exécute tous les jours à minuit
    @Scheduled(cron = "0 0 0 * * ?") 
    public void processExpiredRentals() {
        System.out.println("🤖 ROBOT: Vérification des locations terminées...");
        
        // On cherche les locations qui se sont terminées HIER (ou avant) et qui sont encore "ACTIVE"
        List<Rental> expiredRentals = rentalRepository.findByEndDateBeforeAndStatus(LocalDate.now(), "ACTIVE");

        for (Rental rental : expiredRentals) {
            // A. Clôturer la location
            rental.setStatus("FINISHED");
            rentalRepository.save(rental);

            // B. Rendre le vélo DISPONIBLE
            Bike bike = rental.getBike();
            bike.setStatus("AVAILABLE");
            bikeRepository.save(bike);
            
            System.out.println("✅ Vélo " + bike.getModel() + " est maintenant DISPONIBLE.");

            // C. Prévenir le suivant sur la liste d'attente
            notifyNextWaiter(bike);
        }
    }

    private void notifyNextWaiter(Bike bike) {
        // On récupère la liste d'attente pour ce vélo, triée du plus ancien au plus récent
        List<WaitingList> waiters = waitingListRepository.findByBikeIdOrderByRequestDateAsc(bike.getId());
        
        if (!waiters.isEmpty()) {
            // Le premier arrivé est le premier servi
            WaitingList firstWaiter = waiters.get(0);
            
            String emailDestinataire = firstWaiter.getUser().getEmail();
            
            System.out.println("📧 ENVOI MAIL À : " + emailDestinataire);

            // 1. ENVOI DU MAIL
            try {
                emailService.sendSimpleMessage(
                    emailDestinataire, 
                    "Le vélo " + bike.getModel() + " est disponible !", 
                    "Bonne nouvelle ! Le vélo que vous attendiez est de retour en stock. " +
                    "Connectez-vous vite sur GustaveBike pour le louer avant qu'il ne reparte !"
                );
            } catch (Exception e) {
                System.err.println("❌ Erreur d'envoi de mail : " + e.getMessage());
            }
            
            // 2. SUPPRESSION DE LA LISTE D'ATTENTE
            // Une fois notifié, on l'enlève de la liste pour qu'il ne reçoive pas le mail en boucle
            waitingListRepository.delete(firstWaiter);
            System.out.println("🗑️ Utilisateur retiré de la liste d'attente.");
        }
    }
}