package fr.univ.eiffel.gustavebike.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 1. Définit le chemin vers le dossier uploads
        Path uploadDir = Paths.get("./src/main/resources/static/uploads/");
        
        // 2. CORRECTION IMPORTANTE : 
        // On utilise .toUri().toString() pour que Windows génère un chemin valide
        // (file:///C:/... au lieu de file:C:\...)
        String uploadUri = uploadDir.toUri().toString();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadUri);
                
        System.out.println("📂 DOSSIER IMAGES CONFIGURÉ CORRECTEMENT : " + uploadUri);
    }
}