package tech.hirsun.project.mahjongserver.service;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import tech.hirsun.project.mahjongserver.model.Game;
import tech.hirsun.project.mahjongserver.model.Room;
import tech.hirsun.project.mahjongserver.model.User;
import tech.hirsun.project.mahjongserver.repository.RoomRepository;
import tech.hirsun.project.mahjongserver.repository.UserRepository;
import tech.hirsun.project.mahjongserver.util.RandomUtil;

@Service
public class RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Create a new room
     * @param creatorEmail Email of the room creator
     * @return The created room
     */
    public Room createRoom(String creatorEmail) {
        // Generate unique room ID
        String roomId;
        do {
            roomId = RandomUtil.generateRoomNumber();
        } while (roomRepository.existsById(roomId));

        // Generate password
        String password = RandomUtil.generatePassword();

        // Create and save room
        Room room = new Room(roomId, password, creatorEmail);
        return roomRepository.save(room);
    }

    /**
     * Get a room by ID
     * @param roomId Room ID
     * @return The room if found, null otherwise
     */
    public Room getRoomById(String roomId) {
        return roomRepository.findById(roomId);
    }

    /**
     * Get all active rooms
     * @return List of active rooms
     */
    public Collection<Room> getAllActiveRooms() {
        return roomRepository.findAllActive();
    }

    /**
     * Join a room
     * @param roomId Room ID
     * @param password Room password
     * @param userEmail User's email
     * @return The room if joined successfully, null otherwise
     */
    public Room joinRoom(String roomId, String password, String userEmail) {
        Room room = roomRepository.findById(roomId);
        
        // Check if room exists, password is correct, and room can be joined
        if (room != null && room.getPassword().equals(password) && room.canJoin()) {
            // Add player to room
            room.addPlayer(userEmail);
            roomRepository.save(room);
            return room;
        }
        
        return null;
    }

    /**
     * Start a game in a room
     * @param roomId Room ID
     * @param userEmail User's email (must be the room creator)
     * @return true if game started successfully, false otherwise
     */
    public boolean startGame(String roomId, String userEmail) {
        Room room = roomRepository.findById(roomId);
        
        System.out.println("StartGame request for room " + roomId + " from user " + userEmail);
        
        if (room == null) {
            System.out.println("Room not found: " + roomId);
            return false;
        }
        
        // 增加详细日志
        System.out.println("Room status: " + room.getStatus());
        System.out.println("Room creator: " + room.getCreatorEmail());
        System.out.println("Player count: " + room.getPlayerEmails().size());
        System.out.println("Current game: " + (room.getCurrentGame() != null ? "present" : "null"));
        
        // 如果房间有游戏且游戏状态为FINISHED，但房间状态不是WAITING
        // 则自动将房间状态设置为WAITING
        if (room.getCurrentGame() != null && 
            room.getCurrentGame().getStatus() == Game.GameStatus.FINISHED && 
            room.getStatus() != Room.RoomStatus.WAITING) {
            
            System.out.println("Room has finished game but status is not WAITING. Fixing status...");
            room.setStatus(Room.RoomStatus.WAITING);
            roomRepository.save(room);
        }
        
        // 检查用户是否是房主
        if (!room.getCreatorEmail().equals(userEmail)) {
            System.out.println("User " + userEmail + " is not the creator of room " + roomId);
            return false;
        }
        
        // 检查游戏是否可以开始
        if (!room.canStartGame()) {
            System.out.println("Cannot start game in room " + roomId + 
                ". Need at least 2 players and room must be in waiting state");
            return false;
        }
        
        // 可以开始游戏
        System.out.println("Starting game in room " + roomId);
        room.setStatus(Room.RoomStatus.PLAYING);
        roomRepository.save(room);
        return true;
    }

    /**
     * Get players in a room with their nicknames
     * @param roomId Room ID
     * @return List of users in the room
     */
    public List<User> getPlayersInRoom(String roomId) {
        Room room = roomRepository.findById(roomId);
        if (room != null) {
            return room.getPlayerEmails().stream()
                    .map(email -> userRepository.findByEmail(email))
                    .collect(Collectors.toList());
        }
        return List.of();
    }

    /**
     * Check if a user is in a room
     * @param roomId Room ID
     * @param userEmail User's email
     * @return true if user is in the room, false otherwise
     */
    public boolean isUserInRoom(String roomId, String userEmail) {
        Room room = roomRepository.findById(roomId);
        return room != null && room.getPlayerEmails().contains(userEmail);
    }

    /**
     * Delete expired rooms
     * @return Number of rooms deleted
     */
    public int cleanupExpiredRooms() {
        return roomRepository.deleteAllExpired();
    }
} 