package tech.hirsun.mahjong.service;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import tech.hirsun.mahjong.model.Room;
import tech.hirsun.mahjong.model.User;
import tech.hirsun.mahjong.repository.RoomRepository;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    /**
     * 创建新房间
     * @param creator 房间创建者
     * @return 创建的房间
     */
    public Room createRoom(User creator) {
        int roomId = roomRepository.generateUniqueRoomId();
        String password = roomRepository.generateRoomPassword();
        
        Room room = new Room(roomId, password, creator);
        return roomRepository.save(room);
    }

    /**
     * 加入房间
     * @param roomId 房间ID
     * @param password 房间密码
     * @param user 加入的用户
     * @return 加入的房间，如果加入失败则返回null
     */
    public Room joinRoom(int roomId, String password, User user) {
        Room room = roomRepository.findByRoomId(roomId);
        
        if (room == null || room.isExpired()) {
            return null; // 房间不存在或已过期
        }
        
        if (!room.getPassword().equals(password)) {
            return null; // 密码错误
        }
        
        if (room.getPlayers().size() >= 4) {
            return null; // 房间已满
        }
        
        if (room.getPlayers().contains(user)) {
            return room; // 用户已在房间中
        }
        
        if (room.addPlayer(user)) {
            return roomRepository.save(room);
        }
        
        return null;
    }

    /**
     * 离开房间
     * @param roomId 房间ID
     * @param user 离开的用户
     * @return 是否成功离开
     */
    public boolean leaveRoom(int roomId, User user) {
        Room room = roomRepository.findByRoomId(roomId);
        
        if (room == null) {
            return false; // 房间不存在
        }
        
        if (room.isGameInProgress()) {
            return false; // 游戏进行中，不能离开
        }
        
        if (room.removePlayer(user)) {
            // 如果房间没有玩家了，删除房间
            if (room.getPlayers().isEmpty()) {
                roomRepository.deleteRoom(roomId);
            } else if (room.isCreator(user)) {
                // 如果创建者离开，将第一个玩家设为新的创建者
                room.setCreator(room.getPlayers().get(0));
                roomRepository.save(room);
            } else {
                roomRepository.save(room);
            }
            return true;
        }
        
        return false;
    }

    /**
     * 获取房间列表
     * @return 所有未过期的房间列表
     */
    public List<Room> getAllRooms() {
        List<Room> allRooms = roomRepository.getAllRooms();
        Date now = new Date();
        
        // 过滤掉已过期的房间
        return allRooms.stream()
                .filter(room -> !room.isExpired())
                .collect(Collectors.toList());
    }

    /**
     * 获取房间详情
     * @param roomId 房间ID
     * @return 房间对象，如果不存在则返回null
     */
    public Room getRoomById(int roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        
        if (room != null && !room.isExpired()) {
            return room;
        }
        
        return null;
    }

    /**
     * 检查用户是否在房间中
     * @param roomId 房间ID
     * @param user 用户
     * @return 是否在房间中
     */
    public boolean isUserInRoom(int roomId, User user) {
        Room room = roomRepository.findByRoomId(roomId);
        return room != null && room.getPlayers().contains(user);
    }

    /**
     * 获取用户所在的房间
     * @param user 用户
     * @return 用户所在的房间列表
     */
    public List<Room> getRoomsByUser(User user) {
        return roomRepository.findRoomsByPlayer(user);
    }
} 