package tech.hirsun.project.mahjongserver.schedule;

import java.util.Collection;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import tech.hirsun.project.mahjongserver.model.Room;
import tech.hirsun.project.mahjongserver.repository.RoomRepository;
import tech.hirsun.project.mahjongserver.service.WebSocketService;

@Component
public class RoomCleanupTask {

    private static final Logger LOGGER = Logger.getLogger(RoomCleanupTask.class.getName());

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private WebSocketService webSocketService;

    @Value("${room.expiration}")
    private long roomExpiration;

    /**
     * Scheduled task to clean up expired rooms
     * Runs at the interval specified in application.properties
     */
    @Scheduled(fixedRateString = "${room.cleanup.interval}")
    public void cleanupExpiredRooms() {
        LOGGER.info("Starting room cleanup task");
        
        // Find all expired rooms
        Collection<Room> expiredRooms = roomRepository.findAllExpired();
        
        // Notify users in expired rooms
        for (Room room : expiredRooms) {
            LOGGER.info("Room " + room.getRoomId() + " has expired and will be deleted");
            webSocketService.sendSystemNotification(room.getRoomId(), "This room has expired and will be deleted.");
        }
        
        // Delete expired rooms
        int deletedCount = roomRepository.deleteAllExpired();
        LOGGER.info("Deleted " + deletedCount + " expired rooms");
        
        // Find rooms that will expire soon (within 1 hour)
        Collection<Room> expiringRooms = roomRepository.findAllExpiringWithin(1);
        
        // Notify users in rooms that will expire soon
        for (Room room : expiringRooms) {
            LOGGER.info("Room " + room.getRoomId() + " will expire soon");
            webSocketService.sendSystemNotification(room.getRoomId(), "This room will expire soon. Please finish your game.");
        }
    }
} 