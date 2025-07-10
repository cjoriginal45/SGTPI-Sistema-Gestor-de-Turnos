package com.SGTPI.SystemProject;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SGTPIApplication {

	public static void main(String[] args) {
		SpringApplication.run(SGTPIApplication.class, args);
	}

}
