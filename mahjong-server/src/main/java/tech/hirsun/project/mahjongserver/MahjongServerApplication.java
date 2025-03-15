package tech.hirsun.project.mahjongserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // Enable scheduling for room cleanup tasks
public class MahjongServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(MahjongServerApplication.class, args);
    }

}
