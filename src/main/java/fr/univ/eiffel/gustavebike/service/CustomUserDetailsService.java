package fr.univ.eiffel.gustavebike.service;

import fr.univ.eiffel.gustavebike.model.User;
import fr.univ.eiffel.gustavebike.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service // ⚠️ C'est cette ligne qui corrige l'erreur "Parameter 2... required a bean"
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // 1. On cherche l'utilisateur dans la base de données
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur inconnu : " + email));

        // 2. On le convertit en utilisateur "Spring Security"
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),          // Identifiant (Email)
                user.getPassword(),       // Mot de passe (Haché)
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole())) // Rôle (ex: ROLE_ADMIN)
        );
    }
}