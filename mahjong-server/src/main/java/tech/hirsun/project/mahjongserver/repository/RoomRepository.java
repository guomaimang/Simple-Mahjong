package tech.hirsun.project.mahjongserver.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Repository;

import tech.hirsun.project.mahjongserver.model.Room;

@Repository
public class RoomRepository {
    // Store rooms by room ID
    private final Map<String, Room> roomMap = new ConcurrentHashMap<>();

    /**
     * Save or update a room
     * @param room The room to save
     * @return The saved room
     */
    public Room save(Room room) {
        if (room != null && room.getRoomId() != null) {
            roomMap.put(room.getRoomId(), room);
        }
        return room;
    }

    /**
     * Find a room by ID
     * @param roomId The room ID to search for
     * @return The room if found, null otherwise
     */
    public Room findById(String roomId) {
        return roomMap.get(roomId);
    }

    /**
     * Check if a room exists
     * @param roomId The room ID to check
     * @return true if the room exists, false otherwise
     */
    public boolean existsById(String roomId) {
        return roomMap.containsKey(roomId);
    }

    /**
     * Get all rooms
     * @return Collection of all rooms
     */
    public Collection<Room> findAll() {
        return roomMap.values();
    }

    /**
     * Find all active rooms (not expired)
     * @return Collection of active rooms
     */
    public Collection<Room> findAllActive() {
        return roomMap.values().stream()
                .filter(room -> !room.isExpired())
                .collect(Collectors.toList());
    }

    /**
     * Find all expired rooms
     * @return Collection of expired rooms
     */
    public Collection<Room> findAllExpired() {
        return roomMap.values().stream()
                .filter(Room::isExpired)
                .collect(Collectors.toList());
    }

    /**
     * Find all rooms that will expire within the given number of hours
     * @param hours Number of hours
     * @return Collection of rooms expiring soon
     */
    public Collection<Room> findAllExpiringWithin(int hours) {
        LocalDateTime cutoff = LocalDateTime.now().plusHours(hours);
        return roomMap.values().stream()
                .filter(room -> room.getCreationTime().plusHours(24).isBefore(cutoff))
                .collect(Collectors.toList());
    }

    /**
     * Delete a room by ID
     * @param roomId The ID of the room to delete
     */
    public void deleteById(String roomId) {
        roomMap.remove(roomId);
    }

    /**
     * Delete all expired rooms
     * @return The number of rooms deleted
     */
    public int deleteAllExpired() {
        Collection<Room> expiredRooms = findAllExpired();
        expiredRooms.forEach(room -> roomMap.remove(room.getRoomId()));
        return expiredRooms.size();
    }

    /**
     * Clear all rooms
     */
    public void clear() {
        roomMap.clear();
    }
} 