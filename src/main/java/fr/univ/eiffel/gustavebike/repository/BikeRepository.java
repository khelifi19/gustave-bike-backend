package fr.univ.eiffel.gustavebike.repository;

import fr.univ.eiffel.gustavebike.model.Bike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BikeRepository extends JpaRepository<Bike, Long> {
    
    // Vous devez déclarer cette méthode pour que le Controller puisse l'utiliser.
    // Spring Boot va traduire ceci automatiquement en SQL :
    // SELECT * FROM bike WHERE rent_count > [valeur] AND for_sale = TRUE
    List<Bike> findByRentCountGreaterThanAndForSaleTrue(int rentCount);

}