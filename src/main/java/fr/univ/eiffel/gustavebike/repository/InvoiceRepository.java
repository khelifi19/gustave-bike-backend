package fr.univ.eiffel.gustavebike.repository;

import fr.univ.eiffel.gustavebike.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    // Le fait d'étendre JpaRepository donne accès à findAll(), save(), etc.
}