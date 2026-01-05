package fr.univ.eiffel.gustavebike.repository;

import fr.univ.eiffel.gustavebike.model.Bike;
import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.model.WaitingList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WaitingListRepository extends JpaRepository<WaitingList, Long> {

    // 1. Pour l'affichage admin (View Waiting List)
    List<WaitingList> findByBikeId(Long bikeId);

    // 2. Pour éviter les doublons
    boolean existsByUserAndBike(User user, Bike bike);

    // 3. LA MÉTHODE QUI MANQUAIT (Celle de votre 2ème capture d'écran)
    // Elle permet de récupérer la liste triée simplement par date
    List<WaitingList> findByBikeIdOrderByRequestDateAsc(Long bikeId);

    // 4. Pour le nouveau Service Intelligent (Timer + Status)
    List<WaitingList> findByStatus(WaitingList.Status status);

    // 5. La requête complexe pour prioriser les PROs
    @Query("SELECT w FROM WaitingList w JOIN w.user u " +
           "WHERE w.bike.id = :bikeId AND w.status = 'PENDING' " +
           "ORDER BY u.isPro DESC, w.requestDate ASC")
    List<WaitingList> findNextInLine(@Param("bikeId") Long bikeId);
}