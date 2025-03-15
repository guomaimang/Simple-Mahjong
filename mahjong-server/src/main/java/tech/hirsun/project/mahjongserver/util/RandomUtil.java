package tech.hirsun.project.mahjongserver.util;

import java.security.SecureRandom;
import java.util.Random;

public class RandomUtil {
    private static final Random RANDOM = new SecureRandom();
    
    /**
     * Generates a random room number between 1 and 999
     * @return a random room number
     */
    public static String generateRoomNumber() {
        int roomNumber = RANDOM.nextInt(999) + 1; // 1-999
        return String.format("%03d", roomNumber); // Format as 3 digits with leading zeros
    }
    
    /**
     * Generates a random 4-digit password
     * @return a random 4-digit password
     */
    public static String generatePassword() {
        int password = RANDOM.nextInt(10000); // 0-9999
        return String.format("%04d", password); // Format as 4 digits with leading zeros
    }
} 