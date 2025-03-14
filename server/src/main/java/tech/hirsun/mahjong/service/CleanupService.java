package tech.hirsun.mahjong.service;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import tech.hirsun.mahjong.model.Room;
import tech.hirsun.mahjong.model.User;
import tech.hirsun.mahjong.repository.RoomRepository;

@Service
public class CleanupService {

    private static final Logger logger = LoggerFactory.getLogger(CleanupService.class);
    
    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messagingTemplate;
    
    public CleanupService(RoomRepository roomRepository, SimpMessagingTemplate messagingTemplate) {
        this.roomRepository = roomRepository;
        this.messagingTemplate = messagingTemplate;
    }
    
    /**
     * 定时清理过期房间，每小时执行一次
     */
    @Scheduled(fixedRate = 3600000) // 每小时执行一次
    public void cleanupRooms() {
        logger.info("开始执行房间清理任务");
        Date now = new Date();
        List<Room> rooms = roomRepository.getAllRooms();
        
        for (Room room : rooms) {
            // 检查是否过期(24小时)
            if (now.getTime() - room.getCreatedTime().getTime() > 24 * 60 * 60 * 1000) {
                // 通知房间内所有玩家
                notifyRoomExpired(room);
                // 删除房间
                roomRepository.deleteRoom(room.getRoomId());
                logger.info("已删除过期房间: {}", room.getRoomId());
            }
            // 检查是否即将过期(12小时)
            else if (now.getTime() - room.getCreatedTime().getTime() > 12 * 60 * 60 * 1000) {
                // 通知房间内所有玩家
                notifyRoomExpiringSoon(room);
                logger.info("已发送房间即将过期通知: {}", room.getRoomId());
            }
        }
        
        logger.info("房间清理任务完成");
    }
    
    /**
     * 通知房间已过期
     */
    private void notifyRoomExpired(Room room) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "ROOM_EXPIRE");
        message.put("data", createRoomExpireData(room, "房间已过期，已被系统自动删除"));
        
        for (User player : room.getPlayers()) {
            messagingTemplate.convertAndSendToUser(
                player.getEmail(),
                "/topic/room",
                message
            );
        }
    }
    
    /**
     * 通知房间即将过期
     */
    private void notifyRoomExpiringSoon(Room room) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "ROOM_EXPIRE_SOON");
        message.put("data", createRoomExpireData(room, "房间将在12小时后过期"));
        
        for (User player : room.getPlayers()) {
            messagingTemplate.convertAndSendToUser(
                player.getEmail(),
                "/topic/room",
                message
            );
        }
    }
    
    /**
     * 创建房间过期通知数据
     */
    private Map<String, Object> createRoomExpireData(Room room, String message) {
        Map<String, Object> data = new HashMap<>();
        data.put("roomId", room.getRoomId());
        data.put("message", message);
        data.put("expiryTime", room.getExpiryTime());
        return data;
    }
} 