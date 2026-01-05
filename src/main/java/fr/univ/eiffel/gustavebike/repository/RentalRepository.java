package fr.univ.eiffel.gustavebike.repository;

import fr.univ.eiffel.gustavebike.model.Rental;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RentalRepository extends JpaRepository<Rental, Long> {

    // 1. LOGIQUE ANTI-DOUBLON ROBUSTE (Mathématique)
    // Vérifie si une location ACTIVE chevauche les dates demandées.
    // Formule : (StartA <= EndB) et (EndA >= StartB)
    @Query("SELECT r FROM Rental r WHERE r.bike.id = :bikeId " +
           "AND r.status = 'ACTIVE' " + 
           "AND (:start <= r.endDate AND :end >= r.startDate)")
    List<Rental> findOverlappingRentals(@Param("bikeId") Long bikeId, 
                                      @Param("start") LocalDate start, 
                                      @Param("end") LocalDate end);

    // 2. SÉCURITÉ CONFIDENTIALITÉ (Problème "Mes Locations")
    // On force le filtrage sur l'email de l'utilisateur.
    @Query("SELECT r FROM Rental r WHERE r.user.email = :email ORDER BY r.startDate DESC")
    List<Rental> findByUserEmailOrderByStartDateDesc(@Param("email") String email);

    // 3. ROBOT DE NETTOYAGE (Pour le Scheduler)
    // Trouve les locations qui sont censées être finies
    List<Rental> findByEndDateBeforeAndStatus(LocalDate date, String status);

    // 4. HISTORIQUE VÉLO (Pour le Frontend - Calendrier)
    // C'est cette méthode qui manquait dans votre code précédent !
    // Elle permet au calendrier JS de savoir quels jours griser.
    List<Rental> findByBikeId(Long bikeId);
}