package fr.univ.eiffel.gustavebike.repository;

import fr.univ.eiffel.gustavebike.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByUsername(String username);
    
    // C'est cette ligne qui va corriger tes erreurs rouges dans le Controller :
    Optional<User> findByEmail(String email);
}