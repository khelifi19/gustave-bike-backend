package fr.univ.eiffel.gustavebike.repository;
import fr.univ.eiffel.gustavebike.model.Accessory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessoryRepository extends JpaRepository<Accessory, Long> {
}