package fr.univ.eiffel.gustavebike.repository;

import fr.univ.eiffel.gustavebike.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByBikeId(Long bikeId);
}