package tech.hirsun.mahjong.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;

import tech.hirsun.mahjong.model.Room;
import tech.hirsun.mahjong.model.User;

@Repository
public class RoomRepository {
    // 使用ConcurrentHashMap保证线程安全
    private final Map<Integer, Room> rooms = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public Room findByRoomId(int roomId) {
        return rooms.get(roomId);
    }

    public Room save(Room room) {
        rooms.put(room.getRoomId(), room);
        return room;
    }

    public void deleteRoom(int roomId) {
        rooms.remove(roomId);
    }

    public List<Room> getAllRooms() {
        return new ArrayList<>(rooms.values());
    }

    public boolean existsByRoomId(int roomId) {
        return rooms.containsKey(roomId);
    }

    public List<Room> findRoomsByPlayer(User player) {
        List<Room> playerRooms = new ArrayList<>();
        for (Room room : rooms.values()) {
            if (room.getPlayers().contains(player)) {
                playerRooms.add(room);
            }
        }
        return playerRooms;
    }

    public int generateUniqueRoomId() {
        int roomId;
        do {
            // 生成1-999之间的随机数
            roomId = random.nextInt(999) + 1;
        } while (existsByRoomId(roomId));
        return roomId;
    }

    public String generateRoomPassword() {
        // 生成4位数字密码
        return String.format("%04d", random.nextInt(10000));
    }
} 