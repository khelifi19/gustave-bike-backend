package fr.univ.eiffel.gustavebike.service;

import org.springframework.stereotype.Service;

@Service // Dit à Spring : "C'est un composant utilisable partout"
public class ConsoleNotificationService implements NotificationService {

    @Override
    public void sendNotification(String user, String message) {
        // On simule un SMS avec un affichage bien visible
        System.err.println("=================================================");
        System.err.println("📱 [SMS ENVOYÉ À " + user.toUpperCase() + "]");
        System.err.println("📩 Message : " + message);
        System.err.println("=================================================");
    }
}